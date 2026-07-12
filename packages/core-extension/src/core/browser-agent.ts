import { type ModelMessage, stepCountIs, ToolLoopAgent } from "ai";
import { inject, injectable } from "inversify";
import type {
	AgentEventListener,
	AgentUnsubscribe,
	BrowserAgentInputPort,
} from "../input-ports/browser-agent";
import { ExtensionToolCallInputPort } from "../input-ports/extension-tool-call";
import { LlmProviderOutputPort } from "../output-ports/llm-provider";
import { LoggerFactoryOutputPort } from "../output-ports/logger-factory";
import type {
	AgentCreateSessionParams,
	AgentProgressEvent,
	AgentSendMessageParams,
	AgentSession,
} from "../types";
import { createBrowserAgentTools } from "./browser-agent-tools";

/** System instructions handed to the agent loop for every turn. */
const SYSTEM_PROMPT = `You are a browser agent operating a live web browser through the provided tools.
Use the tools to observe and act on tabs on the user's behalf. Prefer the readable
element tools (getReadableElements / clickOnElement / fillTextToElement) over pixel
coordinates. When a tab is not specified, the session's target tab is used. Be concise.`;

/** Stop the tool loop after this many steps to bound runaway turns. */
const MAX_STEPS = 32;

/** Internal per-session bookkeeping held in the registry. */
interface SessionEntry {
	session: AgentSession;
	/** The agent is stateless; this session's conversation transcript lives here. */
	messages: ModelMessage[];
	/** Replayable durable transcript (excludes transient assistant deltas). */
	history: AgentProgressEvent[];
	/** Aborts the in-flight turn, if any. */
	abortController?: AbortController;
}

/** Event `type`s persisted to `history` — the durable, replayable subset. */
const DURABLE_EVENT_TYPES = new Set<AgentProgressEvent["type"]>([
	"session-created",
	"session-updated",
	"session-ended",
	"user-message",
	"turn-started",
	"tool-call",
	"tool-result",
	"turn-completed",
	"aborted",
	"error",
]);

/**
 * Core wrap of the AI SDK v7 `ToolLoopAgent` (`ai`). Fulfils the
 * {@link BrowserAgentInputPort}: owns the agent loop, an in-memory session
 * registry, and event mapping; the model/provider sits behind the driven
 * {@link LlmProviderOutputPort}, and tools act through the existing
 * {@link ExtensionToolCallInputPort}.
 *
 * `ToolLoopAgent` is a pure-JS tool-calling loop (no sandbox/subprocess), so this
 * runs inside the MV3 background service worker. The agent is stateless, so each
 * {@link AgentSession} owns its own `ModelMessage[]` transcript here; a fresh
 * `ToolLoopAgent` is built per turn so the per-turn tools (which close over the
 * session's event sink + tab/window defaults) take effect.
 */
@injectable()
export class BrowserAgentUseCase implements BrowserAgentInputPort {
	private readonly logger;
	private readonly sessions = new Map<string, SessionEntry>();
	private readonly listeners = new Set<AgentEventListener>();

	constructor(
		@inject(ExtensionToolCallInputPort)
		private readonly toolCall: ExtensionToolCallInputPort,
		@inject(LlmProviderOutputPort)
		private readonly llmProvider: LlmProviderOutputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("BrowserAgentUseCase");
	}

	createSession = async (
		params?: AgentCreateSessionParams,
	): Promise<AgentSession> => {
		const now = Date.now();
		const session: AgentSession = {
			sessionId: crypto.randomUUID(),
			status: "idle",
			target: params?.target,
			title: params?.title,
			createdAt: now,
			updatedAt: now,
		};
		this.sessions.set(session.sessionId, {
			session,
			messages: [],
			history: [],
		});
		this.emit({
			type: "session-created",
			sessionId: session.sessionId,
			at: now,
			session,
		});
		this.logger.info("session created", {
			sessionId: session.sessionId,
		});
		return session;
	};

	endSession = async (sessionId: string): Promise<void> => {
		const entry = this.sessions.get(sessionId);
		if (!entry) return;
		entry.abortController?.abort();
		this.sessions.delete(sessionId);
		this.emit({
			type: "session-ended",
			sessionId,
			at: Date.now(),
		});
	};

	sendMessage = async (params: AgentSendMessageParams): Promise<void> => {
		const { sessionId, message } = params;
		const entry = this.sessions.get(sessionId);
		if (!entry) {
			throw new Error(`Unknown session: ${sessionId}`);
		}
		const turnId = `${sessionId}:${Date.now()}`;
		const now = Date.now();
		entry.messages.push({
			role: "user",
			content: message.content,
		});
		this.setStatus(entry, "running");
		this.emit({
			type: "user-message",
			sessionId,
			turnId,
			at: now,
			content: message.content,
		});
		this.emit({
			type: "turn-started",
			sessionId,
			turnId,
			at: Date.now(),
		});

		// Resolve once the turn is *accepted*: kick off the stream loop without
		// awaiting completion (the input port contract). Progress is reported async.
		void this.runTurn(entry, turnId);
	};

	/** Drive one agent turn and map its stream to progress events. */
	private async runTurn(entry: SessionEntry, turnId: string): Promise<void> {
		const { sessionId } = entry.session;
		const abortController = new AbortController();
		entry.abortController = abortController;

		// Tools bound to this session's tool-event sink + target defaults. These are
		// passed to the per-turn agent and auto-executed by the loop.
		const tools = createBrowserAgentTools(
			this.toolCall,
			{
				onToolCall: (toolName, args) =>
					this.emit({
						type: "tool-call",
						sessionId,
						turnId,
						at: Date.now(),
						toolName,
						args,
					}),
				onToolResult: (toolName, outcome) =>
					this.emit({
						type: "tool-result",
						sessionId,
						turnId,
						at: Date.now(),
						toolName,
						ok: outcome.ok,
						result: outcome.result,
						reason: outcome.reason,
					}),
			},
			{
				defaultTabId: entry.session.target?.tabId,
				defaultWindowId: entry.session.target?.windowId,
			},
		);

		try {
			const agent = new ToolLoopAgent({
				model: await this.llmProvider.getModel(),
				instructions: SYSTEM_PROMPT,
				tools,
				stopWhen: stepCountIs(MAX_STEPS),
			});
			const result = await agent.stream({
				messages: entry.messages,
				abortSignal: abortController.signal,
			});

			let assistantText = "";
			for await (const part of result.fullStream) {
				switch (part.type) {
					case "text-delta": {
						const delta = part.text ?? "";
						assistantText += delta;
						// Transient delta — fanned out but NOT persisted to history.
						this.emitTransient({
							type: "assistant-message",
							sessionId,
							turnId,
							at: Date.now(),
							content: delta,
							done: false,
						});
						break;
					}
					case "error": {
						throw part.error ?? new Error("agent stream error");
					}
					case "abort": {
						this.emit({
							type: "aborted",
							sessionId,
							turnId,
							at: Date.now(),
						});
						this.setStatus(entry, "idle");
						return;
					}
				}
			}

			// Persist the turn's model messages so the next turn keeps context.
			const { messages: responseMessages } = await result.response;
			entry.messages.push(...responseMessages);

			// Final coalesced assistant message is durable.
			this.emit({
				type: "assistant-message",
				sessionId,
				turnId,
				at: Date.now(),
				content: assistantText,
				done: true,
			});
			this.emit({
				type: "turn-completed",
				sessionId,
				turnId,
				at: Date.now(),
			});
			this.setStatus(entry, "idle");
		} catch (error) {
			if (abortController.signal.aborted) {
				this.emit({
					type: "aborted",
					sessionId,
					turnId,
					at: Date.now(),
				});
				this.setStatus(entry, "idle");
				return;
			}
			const reason = error instanceof Error ? error.message : String(error);
			this.logger.error("turn failed", error);
			this.emit({
				type: "error",
				sessionId,
				turnId,
				at: Date.now(),
				message: reason,
			});
			this.setStatus(entry, "error");
		} finally {
			entry.abortController = undefined;
		}
	}

	cancel = async (sessionId: string): Promise<void> => {
		const entry = this.sessions.get(sessionId);
		if (!entry) return;
		entry.abortController?.abort();
		// The stream loop emits `aborted` + flips status when it observes the abort;
		// if no turn was in flight this is a no-op (idempotent).
	};

	getSession = async (sessionId: string): Promise<AgentSession | undefined> => {
		return this.sessions.get(sessionId)?.session;
	};

	listSessions = async (): Promise<AgentSession[]> => {
		return [
			...this.sessions.values(),
		].map((entry) => entry.session);
	};

	getHistory = async (sessionId: string): Promise<AgentProgressEvent[]> => {
		return [
			...(this.sessions.get(sessionId)?.history ?? []),
		];
	};

	subscribe = (listener: AgentEventListener): AgentUnsubscribe => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/** Flip a session's status, emit `session-updated`, bump `updatedAt`. */
	private setStatus(entry: SessionEntry, status: AgentSession["status"]): void {
		entry.session = {
			...entry.session,
			status,
			updatedAt: Date.now(),
		};
		this.emit({
			type: "session-updated",
			sessionId: entry.session.sessionId,
			at: entry.session.updatedAt,
			session: entry.session,
		});
	}

	/**
	 * Fan a durable event out to listeners AND append it to that session's
	 * replayable history.
	 */
	private emit(event: AgentProgressEvent): void {
		if (DURABLE_EVENT_TYPES.has(event.type)) {
			this.sessions.get(event.sessionId)?.history.push(event);
		}
		this.fanOut(event);
	}

	/** Fan a transient event (assistant delta) out without persisting it. */
	private emitTransient(event: AgentProgressEvent): void {
		this.fanOut(event);
	}

	private fanOut(event: AgentProgressEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				this.logger.error("agent event listener threw", error);
			}
		}
	}
}
