import type {
	AgentCreateSessionParams,
	AgentProgressEvent,
	AgentSendMessageParams,
	AgentSession,
} from "../types";

/** Listener invoked for every {@link AgentProgressEvent} the agent emits. */
export type AgentEventListener = (event: AgentProgressEvent) => void;

/** Returned by {@link BrowserAgentInputPort.subscribe} to detach a listener. */
export type AgentUnsubscribe = () => void;

/**
 * Driving contract for the Browser Agent (the `BrowserAgentUseCases` node in
 * `docs/architecture.md`).
 *
 * Realized by {@link import("../core").BrowserAgentUseCase}, which wraps the AI
 * SDK v7 `ToolLoopAgent`. Its only caller is the `AgentRpcController` driving
 * adapter (`@mcp-browser-kit/extension-driving-agent-rpc`), which translates
 * `mbk:agent` port messages into these methods and forwards every
 * {@link AgentProgressEvent} from `subscribe` to the `apps/ext-wxt` sidepanel.
 *
 * This is a *single* agent that owns *many* sessions. The agent object itself is
 * stateless, so each {@link AgentSession} owns its own transcript in the use
 * case's registry, and a fresh `ToolLoopAgent` is built per turn so that turn's
 * tools — which close over the session's event sink and target tab — take
 * effect.
 *
 * It reasons via {@link import("../output-ports").LlmProviderOutputPort} and
 * acts via {@link ExtensionToolCallInputPort}.
 *
 * One lifetime caveat callers must handle: sessions live in memory in the MV3
 * background service worker, which is evicted when idle. A session id is not
 * durable across worker restarts, so a UI holding one must be prepared for
 * `getSession` to return `undefined`.
 */
export interface BrowserAgentInputPort {
	// --- Session lifecycle ---

	/**
	 * Open a new conversation session on the agent. Emits a `session-created`
	 * event and returns the created {@link AgentSession}.
	 */
	createSession(params?: AgentCreateSessionParams): Promise<AgentSession>;

	/**
	 * Close a session: cancel any in-flight turn and discard it. Idempotent.
	 * Emits a `session-ended` event.
	 */
	endSession(sessionId: string): Promise<void>;

	// --- Drive ---

	/**
	 * Drive an agent turn from a user instruction on an existing session.
	 * Resolves once the turn has been *accepted and started* — NOT when it
	 * completes. Progress and the final outcome are reported asynchronously via
	 * {@link subscribe}.
	 */
	sendMessage(params: AgentSendMessageParams): Promise<void>;

	/**
	 * Cancel the in-flight turn for a session, if any. Idempotent: cancelling a
	 * session with no active turn is a no-op. The session stays usable (returns
	 * to `idle`); a cancelled turn emits an `aborted` event.
	 */
	cancel(sessionId: string): Promise<void>;

	// --- Reads (for UI hydration) ---

	/** Snapshot of a single session, or `undefined` if unknown. */
	getSession(sessionId: string): Promise<AgentSession | undefined>;

	/** Snapshot of all known sessions. */
	listSessions(): Promise<AgentSession[]>;

	/**
	 * Durable transcript for a session: the replayable subset of
	 * {@link AgentProgressEvent}s (lifecycle, user/assistant messages, tool
	 * activity), excluding transient `assistant-message` deltas. Lets a reopened
	 * UI hydrate without replaying the live stream.
	 */
	getHistory(sessionId: string): Promise<AgentProgressEvent[]>;

	// --- Stream ---

	/**
	 * Subscribe to progress events across all sessions. The driving adapter
	 * filters by `sessionId` when fanning out to UI connections. Returns an
	 * unsubscribe function.
	 */
	subscribe(listener: AgentEventListener): AgentUnsubscribe;
}

export const BrowserAgentInputPort = Symbol.for("BrowserAgentInputPort");
