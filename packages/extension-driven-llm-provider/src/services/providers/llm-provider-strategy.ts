import type { LanguageModel } from "ai";
import type { LlmModelDescriptor } from "../agent-settings-storage";

/**
 * One provider behind the {@link DrivenLlmProvider} registry.
 *
 * The registry — not the strategy — owns composite `"<providerId>:<modelId>"`
 * ids, storage layout and default selection, so a new provider only has to
 * answer three questions: what are you called, what can you run, and build me
 * this model.
 */
export interface LlmProviderStrategy {
	/** Stable id used as the composite model id's prefix. */
	readonly id: string;
	/** Human-facing label for the settings UI. */
	readonly label: string;

	/**
	 * Whether credentials are present. The registry skips unconfigured providers
	 * when listing models and when picking a default, so an unconfigured provider
	 * is invisible rather than a source of listing errors.
	 */
	isConfigured(): Promise<boolean>;

	/**
	 * Models this provider can run, restricted to ones that support tool calling
	 * — the agent loop is useless without it.
	 *
	 * Called only when {@link isConfigured} resolves true. May hit the network.
	 */
	listModels(): Promise<LlmModelDescriptor[]>;

	/** Build a {@link LanguageModel} for a provider-local model id. */
	createModel(modelId: string): Promise<LanguageModel>;

	/** Provider-local id used when the user has not chosen a model. */
	defaultModelId(): Promise<string | undefined>;
}
