import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ResolvedAuth } from "../auth/auth-strategy";

/** Everything a factory needs to build one model. */
export interface ModelFactoryRequest {
	/** Registry provider id, used as the SDK's provider name. */
	providerId: string;
	/** Provider-local model id. */
	modelId: string;
	/** Base URL: auth override, then registry `api`, then a static override. */
	baseUrl?: string;
	auth: ResolvedAuth;
}

/** Builds a {@link LanguageModel}. May `import()` its SDK package. */
export type ModelFactory = (
	request: ModelFactoryRequest,
) => Promise<LanguageModel>;

/**
 * The default factory: OpenAI-compatible over the registry's base URL.
 *
 * This is not a fallback so much as *the* path — 152 of the registry's ~190
 * providers declare `@ai-sdk/openai-compatible`, and every one of them carries
 * an `api` URL. They need no bundled code beyond this.
 */
export const openAiCompatibleFactory: ModelFactory = async ({
	providerId,
	modelId,
	baseUrl,
	auth,
}) => {
	if (!baseUrl) {
		throw new Error(
			`Provider "${providerId}" has no base URL. models.dev omits one for providers whose URL lives inside a dedicated SDK package; add a static override or define it as a custom provider.`,
		);
	}
	const provider = createOpenAICompatible({
		name: providerId,
		// biome-ignore lint/style/useNamingConvention: the provider's required option key.
		baseURL: baseUrl,
		apiKey: auth.apiKey,
		headers: auth.headers,
		fetch: auth.fetch,
	});
	return provider(modelId);
};

/**
 * npm package name → factory, for providers whose wire format is not
 * OpenAI-compatible or that gain something from their own SDK.
 *
 * Every entry `import()`s lazily. The background is an ES module service worker
 * (see `apps/ext-wxt/entrypoints/background.ts`) precisely so these become
 * separate chunks: MV3 re-parses the worker on every wake, and a user talking to
 * one provider should not pay to parse five SDKs.
 *
 * Anything absent here falls through to {@link openAiCompatibleFactory}.
 */
export const nativeFactories: Record<string, ModelFactory> = {
	"@ai-sdk/anthropic": async ({ modelId, baseUrl, auth }) => {
		const { createAnthropic } = await import("@ai-sdk/anthropic");
		return createAnthropic({
			apiKey: auth.apiKey,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			headers: auth.headers,
			fetch: auth.fetch,
		})(modelId);
	},

	"@ai-sdk/openai": async ({ modelId, baseUrl, auth }) => {
		const { createOpenAI } = await import("@ai-sdk/openai");
		return createOpenAI({
			apiKey: auth.apiKey,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			headers: auth.headers,
			fetch: auth.fetch,
		})(modelId);
	},

	"@ai-sdk/google": async ({ modelId, baseUrl, auth }) => {
		const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
		return createGoogleGenerativeAI({
			apiKey: auth.apiKey,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			headers: auth.headers,
			fetch: auth.fetch,
		})(modelId);
	},

	"@openrouter/ai-sdk-provider": async ({ modelId, baseUrl, auth }) => {
		const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
		return createOpenRouter({
			apiKey: auth.apiKey ?? "",
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			headers: auth.headers,
			fetch: auth.fetch,
		})(modelId);
	},

	"@ai-sdk/gateway": async ({ modelId, baseUrl, auth }) => {
		const { createGateway } = await import("@ai-sdk/gateway");
		return createGateway({
			apiKey: auth.apiKey,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			headers: auth.headers,
			fetch: auth.fetch,
		})(modelId);
	},
};

/** The factory for an npm package name, defaulting to OpenAI-compatible. */
export const factoryFor = (npm: string): ModelFactory =>
	nativeFactories[npm] ?? openAiCompatibleFactory;

/** Whether a package has a bundled native factory. */
export const hasNativeFactory = (npm: string): boolean =>
	npm in nativeFactories;
