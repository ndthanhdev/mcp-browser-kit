import "reflect-metadata";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type {
	AgentProgressEvent,
	AgentTarget,
	LlmProviderOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { BrowserAgentUseCase } from "@mcp-browser-kit/core-extension/core/browser-agent";
import type { ProviderResponse } from "promptfoo";
import {
	type FakeBrowserOptions,
	FakeExtensionTools,
} from "./fake-extension-tools";

interface AgentProviderConfig {
	/** OpenAI-compatible endpoint, the same transport the extension's agent uses. */
	baseUrl: string;
	/** Environment variable that holds the API key for `baseUrl`. */
	apiKeyEnv: string;
	model: string;
	/** Extra fields merged into every chat completions request body. */
	body?: Record<string, unknown>;
}

interface AgentVars extends FakeBrowserOptions {
	/** Session target tab; omitted means the agent has to discover the tab itself. */
	targetTab?: string;
}

interface CallContext {
	vars: Record<string, unknown>;
}

interface CallOptions {
	abortSignal?: AbortSignal;
}

const silentLoggerFactory: LoggerFactoryOutputPort = {
	create: () => ({
		verbose: () => {},
		info: () => {},
		warn: () => {},
		error: (...messages) => console.error("[browser-agent]", ...messages),
	}),
};

const toTarget = (vars: AgentVars): AgentTarget | undefined =>
	vars.targetTab
		? {
				tabId: vars.targetTab,
				windowId: "1701",
			}
		: undefined;

/**
 * promptfoo provider that runs the extension's real `BrowserAgentUseCase` with
 * its production prompts against a fake browser, and reports the tool calls
 * the agent made.
 */
export default class BrowserAgentProvider {
	private readonly providerId: string;
	private readonly config: AgentProviderConfig;

	constructor(options: {
		id?: string;
		label?: string;
		config: AgentProviderConfig;
	}) {
		this.config = options.config;
		this.providerId = options.label ?? options.id ?? "browser-agent";
	}

	id = (): string => this.providerId;

	callApi = async (
		prompt: string,
		context: CallContext,
		options?: CallOptions,
	): Promise<ProviderResponse> => {
		if (!this.config.baseUrl) {
			return {
				error: "Provider config baseUrl is empty",
			};
		}
		const apiKey = process.env[this.config.apiKeyEnv];
		if (!apiKey) {
			return {
				error: `Missing environment variable ${this.config.apiKeyEnv}`,
			};
		}

		const vars = context.vars as unknown as AgentVars;
		const browser = new FakeExtensionTools(vars);
		browser.recording = false;
		const agent = new BrowserAgentUseCase(
			browser,
			this.llmProvider(apiKey),
			silentLoggerFactory,
		);
		const session = await agent.createSession({
			target: toTarget(vars),
		});

		const replies: string[] = [];
		const finished = new Promise<string | undefined>((resolve) => {
			agent.subscribe((event: AgentProgressEvent) => {
				if (event.sessionId !== session.sessionId) return;
				if (event.type === "tool-call") {
					// Emitted just before the tool runs, so the model's first call is recorded.
					browser.recording = true;
				} else if (event.type === "assistant-message" && event.done) {
					replies.push(event.content);
				} else if (event.type === "turn-completed") {
					resolve(undefined);
				} else if (event.type === "error") {
					resolve(event.message);
				} else if (event.type === "aborted") {
					resolve("Agent turn aborted");
				}
			});
		});
		options?.abortSignal?.addEventListener("abort", () => {
			void agent.cancel(session.sessionId);
		});

		await agent.sendMessage({
			sessionId: session.sessionId,
			message: {
				content: prompt,
			},
		});
		const error = await finished;
		await agent.endSession(session.sessionId);

		const metadata = {
			toolCalls: browser.calls,
		};
		return error
			? {
					error,
					metadata,
				}
			: {
					output: replies.join("\n\n"),
					metadata,
				};
	};

	private llmProvider(apiKey: string): LlmProviderOutputPort {
		const { baseUrl, model, body } = this.config;
		const provider = createOpenAICompatible({
			name: this.providerId,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			apiKey,
			transformRequestBody: body
				? (args) => ({
						...args,
						...body,
					})
				: undefined,
		});
		return {
			listProviders: () => [
				{
					id: model,
					label: model,
				},
			],
			getModel: async () => provider.chatModel(model),
		};
	}
}
