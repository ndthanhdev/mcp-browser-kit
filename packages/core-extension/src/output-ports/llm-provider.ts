import type { LanguageModel } from "ai";

/**
 * One model the driven adapter can build a {@link LanguageModel} from. With the
 * OpenRouter adapter the `id` is an OpenRouter model slug (e.g.
 * `anthropic/claude-opus-4-8`); the abstraction stays multi-provider so other
 * `@ai-sdk/*` providers can be added later.
 */
export interface LlmProviderDescriptor {
	/** Stable id passed back as {@link LlmProviderOutputPort.getModel}'s argument. */
	id: string;
	/** Human-facing label for UI selection. */
	label: string;
}

/**
 * Driven port the {@link import("../core").BrowserAgentUseCase} reasons through.
 *
 * The agent loop itself lives in core (it drives the AI SDK v7 `ToolLoopAgent`);
 * this port's only job is to hand back a configured {@link LanguageModel}. That
 * keeps provider selection and credential handling — both adapter concerns —
 * out of the core.
 *
 * Realized by `@mcp-browser-kit/extension-driven-llm-provider` (OpenRouter via
 * `@openrouter/ai-sdk-provider`). Unlike the previous `@ai-sdk/harness` design,
 * that adapter is pure-JS and runs in the MV3 background service worker, so it
 * IS wired into the extension container — see `docs/architecture.md`.
 */
export interface LlmProviderOutputPort {
	/** The models this adapter can build, for UI selection. */
	listProviders(): LlmProviderDescriptor[] | Promise<LlmProviderDescriptor[]>;
	/**
	 * Build the selected (or default) model. Async because the adapter reads the
	 * API key + chosen model from extension storage.
	 *
	 * @param providerId one of {@link listProviders}' ids; omitted → the adapter's
	 *   configured/default model.
	 */
	getModel(providerId?: string): Promise<LanguageModel>;
}

export const LlmProviderOutputPort = Symbol("LlmProviderOutputPort");
