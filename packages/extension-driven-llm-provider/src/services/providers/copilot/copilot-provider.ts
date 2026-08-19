import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { injectable } from "inversify";
import {
	type LlmModelDescriptor,
	PROVIDER_IDS,
	readAgentSettings,
	updateProviderCredentials,
} from "../../agent-settings-storage";
import type { LlmProviderStrategy } from "../llm-provider-strategy";
import { COPILOT_EDITOR_HEADERS } from "./constants";
import { selectUsableCopilotModels } from "./copilot-models";
import { CopilotTokenCache } from "./copilot-token";
import {
	type DeviceCodeGrant,
	fetchGithubLogin,
	pollForAccessToken,
	requestDeviceCode,
} from "./device-flow";
import type { CopilotModelsResponse } from "./wire-types";

/**
 * GitHub Copilot strategy.
 *
 * ⚠️ Reaches an undocumented endpoint by presenting an editor's OAuth client id;
 * see `./constants.ts` for the terms-of-service caveat. Gated behind the
 * `copilot-provider` feature flag, which defaults to off — this class is only
 * bound into the container when the flag is on.
 *
 * Copilot's chat endpoint is OpenAI-compatible, so the actual model is built
 * with `@ai-sdk/openai-compatible`, same as OpenRouter. The interesting part is
 * auth: a long-lived `gho_…` OAuth token (persisted) is exchanged for a
 * ~30-minute bearer (in memory), which a per-request `fetch` wrapper injects so
 * a mid-turn refresh doesn't require rebuilding the model.
 */
@injectable()
export class CopilotProvider implements LlmProviderStrategy {
	readonly id = PROVIDER_IDS.copilot;
	readonly label = "GitHub Copilot";

	private readonly tokens = new CopilotTokenCache(async () => {
		const settings = await readAgentSettings();
		return settings.credentials.copilot?.oauthToken;
	});

	/** Cached model list — `/models` is stable and each turn would re-fetch it. */
	private models?: LlmModelDescriptor[];

	isConfigured = async (): Promise<boolean> => {
		const settings = await readAgentSettings();
		return Boolean(settings.credentials.copilot?.oauthToken);
	};

	// --- Sign-in ---

	/**
	 * Begin the GitHub device flow. Returns what the settings UI must display;
	 * the caller then awaits {@link completeSignIn} with the same grant.
	 */
	beginSignIn = async (): Promise<DeviceCodeGrant> => requestDeviceCode();

	/**
	 * Wait for the user to authorize on github.com, then persist the resulting
	 * OAuth token and the account login.
	 */
	completeSignIn = async (
		grant: DeviceCodeGrant,
		signal?: AbortSignal,
	): Promise<{
		login?: string;
	}> => {
		const oauthToken = await pollForAccessToken(grant, {
			signal,
		});
		const login = await fetchGithubLogin(oauthToken);
		await updateProviderCredentials(PROVIDER_IDS.copilot, () => ({
			oauthToken,
			login,
		}));
		this.tokens.invalidate();
		this.models = undefined;
		return {
			login,
		};
	};

	/** Forget the OAuth token and any derived bearer. */
	signOut = async (): Promise<void> => {
		await updateProviderCredentials(PROVIDER_IDS.copilot, () => ({}));
		this.tokens.invalidate();
		this.models = undefined;
	};

	// --- Models ---

	listModels = async (): Promise<LlmModelDescriptor[]> => {
		if (this.models) {
			return this.models;
		}
		const { token, apiBaseUrl } = await this.tokens.get();
		const response = await fetch(`${apiBaseUrl}/models`, {
			headers: {
				authorization: `Bearer ${token}`,
				accept: "application/json",
				...COPILOT_EDITOR_HEADERS,
			},
		});
		if (!response.ok) {
			throw new Error(`Copilot model listing failed (${response.status}).`);
		}
		const body = (await response.json()) as CopilotModelsResponse;
		this.models = selectUsableCopilotModels(body.data ?? []);
		return this.models;
	};

	defaultModelId = async (): Promise<string | undefined> => {
		const models = await this.listModels();
		return models[0]?.id;
	};

	createModel = async (modelId: string): Promise<LanguageModel> => {
		// Resolve once to learn the base URL; the bearer itself is re-read per
		// request by `authedFetch` below.
		const { apiBaseUrl } = await this.tokens.get();

		const copilot = createOpenAICompatible({
			name: "copilot",
			// biome-ignore lint/style/useNamingConvention: `baseURL` is the provider's required option key.
			baseURL: apiBaseUrl,
			headers: {
				...COPILOT_EDITOR_HEADERS,
			},
			fetch: this.authedFetch,
		});
		return copilot(modelId);
	};

	/**
	 * Injects a *fresh* bearer per request. A turn can run for many minutes across
	 * up to 32 steps, so binding the token at model-construction time would let it
	 * expire mid-loop; the cache hands back the same token until it is close to
	 * expiry, then transparently re-mints it.
	 */
	private authedFetch: typeof fetch = async (input, init) => {
		const { token } = await this.tokens.get();
		const headers = new Headers(init?.headers);
		headers.set("authorization", `Bearer ${token}`);
		// Copilot logs reject repeated request ids; the SDK doesn't set one.
		headers.set("x-request-id", crypto.randomUUID());
		return fetch(input, {
			...init,
			headers,
		});
	};
}
