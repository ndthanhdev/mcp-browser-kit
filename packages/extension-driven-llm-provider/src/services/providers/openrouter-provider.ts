import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { injectable } from "inversify";
import {
	type LlmModelDescriptor,
	PROVIDER_IDS,
	readAgentSettings,
} from "../agent-settings-storage";
import type { LlmProviderStrategy } from "./llm-provider-strategy";

/** OpenRouter's OpenAI-compatible endpoint. */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Curated OpenRouter model slugs offered in the settings UI. OpenRouter exposes
 * far more; the settings page also accepts a free-text slug.
 *
 * Hardcoded rather than fetched from `GET /models`: that endpoint returns
 * hundreds of entries and does not reliably flag tool-calling support, so the
 * list would need filtering we can't do accurately. NOTE: verify these slugs
 * against https://openrouter.ai/models — slugs change as models ship.
 */
export const OPENROUTER_MODELS: readonly LlmModelDescriptor[] = [
	{
		id: "anthropic/claude-opus-4.1",
		label: "Claude Opus 4.1 (Anthropic)",
	},
	{
		id: "anthropic/claude-3.7-sonnet",
		label: "Claude 3.7 Sonnet (Anthropic)",
	},
	{
		id: "openai/gpt-4o",
		label: "GPT-4o (OpenAI)",
	},
	{
		id: "google/gemini-2.0-flash-001",
		label: "Gemini 2.0 Flash (Google)",
	},
];

/**
 * OpenRouter strategy: one API key fronts many models (Claude, GPT, …).
 * OpenRouter is OpenAI-API compatible, so it is reached through
 * `@ai-sdk/openai-compatible`.
 *
 * The dedicated `@openrouter/ai-sdk-provider` is now on the same provider spec
 * (`@ai-sdk/provider@4.0.7`) and peers `ai@^7`, so switching to it for native
 * features — provider routing preferences, reasoning config — is possible; it
 * just isn't needed for the plain chat path.
 */
@injectable()
export class OpenRouterProvider implements LlmProviderStrategy {
	readonly id = PROVIDER_IDS.openrouter;
	readonly label = "OpenRouter";

	private readApiKey = async (): Promise<string | undefined> => {
		const settings = await readAgentSettings();
		return settings.credentials.openrouter?.apiKey;
	};

	isConfigured = async (): Promise<boolean> => Boolean(await this.readApiKey());

	listModels = async (): Promise<LlmModelDescriptor[]> => [
		...OPENROUTER_MODELS,
	];

	defaultModelId = async (): Promise<string | undefined> =>
		OPENROUTER_MODELS[0]?.id;

	createModel = async (modelId: string): Promise<LanguageModel> => {
		const apiKey = await this.readApiKey();
		if (!apiKey) {
			throw new Error(
				"OpenRouter API key is not set. Open the extension settings to add it.",
			);
		}
		const openrouter = createOpenAICompatible({
			name: "openrouter",
			// biome-ignore lint/style/useNamingConvention: `baseURL` is the provider's required option key.
			baseURL: OPENROUTER_BASE_URL,
			apiKey,
		});
		return openrouter(modelId);
	};
}
