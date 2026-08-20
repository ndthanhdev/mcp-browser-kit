/**
 * Base URLs for providers models.dev leaves without an `api` field.
 *
 * models.dev omits `api` when the URL is baked into a dedicated SDK package.
 * That is fine for the five packages we bundle, but it strands the rest: a
 * provider with neither a base URL nor a bundled SDK cannot be reached at all.
 *
 * Most of those providers are OpenAI-compatible in practice regardless of which
 * package models.dev names, so recording the URL here brings them back through
 * {@link openAiCompatibleFactory}. Verified against each provider's own API
 * documentation, not guessed.
 *
 * Entries here lose provider-specific features (Groq's service tier, Mistral's
 * document handling). That is the trade: reachable through a common path beats
 * unreachable.
 */
export const PROVIDER_BASE_URL_OVERRIDES: Readonly<Record<string, string>> = {
	openai: "https://api.openai.com/v1",
	groq: "https://api.groq.com/openai/v1",
	cerebras: "https://api.cerebras.ai/v1",
	togetherai: "https://api.together.xyz/v1",
	deepinfra: "https://api.deepinfra.com/v1/openai",
	mistral: "https://api.mistral.ai/v1",
	xai: "https://api.x.ai/v1",
	perplexity: "https://api.perplexity.ai",
	cohere: "https://api.cohere.ai/compatibility/v1",
	vercel: "https://ai-gateway.vercel.sh/v1",
	// Google's OpenAI-compatibility shim. Only used when the native
	// `@ai-sdk/google` factory is unavailable.
	google: "https://generativelanguage.googleapis.com/v1beta/openai",
	// Anthropic's OpenAI-compatibility shim; the native factory is preferred
	// because this one drops prompt caching and extended thinking.
	anthropic: "https://api.anthropic.com/v1",
};

/**
 * Resolve a base URL, most specific first: what authentication discovered, then
 * the registry, then a static override.
 *
 * Auth wins because it reflects the actual account — Copilot Enterprise returns
 * its own host from the token exchange, and the registry's generic URL would be
 * wrong for those users.
 */
export const resolveBaseUrl = (
	providerId: string,
	registryApi: string | undefined,
	authBaseUrl: string | undefined,
): string | undefined =>
	authBaseUrl ?? registryApi ?? PROVIDER_BASE_URL_OVERRIDES[providerId];
