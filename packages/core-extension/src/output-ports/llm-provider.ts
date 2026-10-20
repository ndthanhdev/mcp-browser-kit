import type { LanguageModel } from "ai";

/**
 * One model the driven adapter can build a {@link LanguageModel} from.
 *
 * The `id` is opaque to the core; it only passes it back to
 * {@link LlmProviderOutputPort.getModel}.
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
 * Realized by `@mcp-browser-kit/extension-driven-llm-provider` over
 * user-defined OpenAI-compatible connections.
 */
export interface LlmProviderOutputPort {
	/**
	 * The models this adapter can build, for UI selection. Empty until the user
	 * adds a connection.
	 */
	listProviders(): LlmProviderDescriptor[] | Promise<LlmProviderDescriptor[]>;
	/**
	 * Build the selected (or default) model. Async because the adapter reads the
	 * credentials + chosen model from extension storage.
	 *
	 * @param providerId one of {@link listProviders}' ids; omitted → the user's
	 *   persisted selection, falling back to the first listed model.
	 */
	getModel(providerId?: string): Promise<LanguageModel>;
}

export const LlmProviderOutputPort = Symbol("LlmProviderOutputPort");
