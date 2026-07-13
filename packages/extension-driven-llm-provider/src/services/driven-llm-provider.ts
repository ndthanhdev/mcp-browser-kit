import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
	type LlmProviderDescriptor,
	LlmProviderOutputPort,
	type LlmProviderOutputPort as LlmProviderOutputPortType,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { LanguageModel } from "ai";
import { type Container, injectable } from "inversify";
import {
	AGENT_MODELS,
	DEFAULT_MODEL_ID,
	readAgentSettings,
} from "./agent-settings-storage";

/** OpenRouter's OpenAI-compatible endpoint. */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Driven adapter realizing {@link LlmProviderOutputPortType} with OpenRouter —
 * one API key fronts many models (Claude, GPT, …). OpenRouter is OpenAI-API
 * compatible, so it is reached through `@ai-sdk/openai-compatible` (version-matched
 * to `ai@7-beta`); the dedicated `@openrouter/ai-sdk-provider` still targets the
 * AI SDK v6 provider spec and is incompatible with this `ai` version.
 *
 * Pure JS (no sandbox/subprocess), so unlike the previous `@ai-sdk/harness`
 * adapter it runs in the MV3 background service worker and IS wired into the
 * extension container. The API key + selected model are read from extension
 * storage (`chrome.storage.local`, via `webextension-polyfill`), populated by the
 * settings page under `apps/`.
 */
@injectable()
export class DrivenLlmProvider implements LlmProviderOutputPortType {
	/** Bind this adapter to {@link LlmProviderOutputPort}. */
	static setupContainer(container: Container): void {
		container
			.bind<LlmProviderOutputPortType>(LlmProviderOutputPort)
			.to(DrivenLlmProvider);
	}

	listProviders = (): LlmProviderDescriptor[] =>
		AGENT_MODELS.map((model) => ({
			id: model.id,
			label: model.label,
		}));

	getModel = async (providerId?: string): Promise<LanguageModel> => {
		const settings = await readAgentSettings();
		const apiKey = settings.openRouterApiKey;
		if (!apiKey) {
			throw new Error(
				"OpenRouter API key is not set. Open the extension settings to add it.",
			);
		}
		const modelId = providerId ?? settings.modelId ?? DEFAULT_MODEL_ID;
		const openrouter = createOpenAICompatible({
			name: "openrouter",
			// biome-ignore lint/style/useNamingConvention: `baseURL` is the provider's required option key.
			baseURL: OPENROUTER_BASE_URL,
			apiKey,
		});
		return openrouter(modelId);
	};
}
