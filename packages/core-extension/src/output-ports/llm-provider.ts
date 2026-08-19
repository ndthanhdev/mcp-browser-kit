import type { LanguageModel } from "ai";

/**
 * One model the driven adapter can build a {@link LanguageModel} from.
 *
 * The `id` is opaque to the core. The adapter that realizes this port is a
 * registry over several vendors, so in practice it is a composite
 * `"<providerId>:<modelId>"` — model ids are only unique within a vendor (both
 * OpenRouter and GitHub Copilot expose a `gpt-4o`). The core never parses it;
 * it only passes an id back to {@link LlmProviderOutputPort.getModel}.
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
 * Realized by `@mcp-browser-kit/extension-driven-llm-provider`, a registry over
 * per-vendor strategies (OpenRouter and GitHub Copilot, both reached through
 * `@ai-sdk/openai-compatible`). That adapter is pure-JS, so it runs inside the
 * MV3 background service worker — see `docs/architecture.md`.
 */
export interface LlmProviderOutputPort {
	/**
	 * The models this adapter can build, for UI selection. Only models from
	 * *configured* providers are listed, so this is empty until the user signs in.
	 */
	listProviders(): LlmProviderDescriptor[] | Promise<LlmProviderDescriptor[]>;
	/**
	 * Build the selected (or default) model. Async because the adapter reads the
	 * credentials + chosen model from extension storage.
	 *
	 * @param providerId one of {@link listProviders}' ids; omitted → the user's
	 *   persisted selection, falling back to the first configured provider's
	 *   default.
	 */
	getModel(providerId?: string): Promise<LanguageModel>;
}

export const LlmProviderOutputPort = Symbol("LlmProviderOutputPort");
