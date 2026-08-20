import {
	clearProviderCredential,
	PROVIDER_IDS,
	readAgentSettings,
	updateProviderCredential,
} from "../../agent-settings-storage";
import type { AuthStrategy, ResolvedAuth } from "../auth-strategy";
import { COPILOT_EDITOR_HEADERS } from "./constants";
import { CopilotTokenCache } from "./copilot-token";
import {
	type DeviceCodeGrant,
	fetchGithubLogin,
	pollForAccessToken,
	requestDeviceCode,
} from "./device-flow";

/**
 * GitHub Copilot's device flow.
 *
 * ⚠️ Reaches an undocumented endpoint by presenting an editor's OAuth client id;
 * see `./constants.ts` for the terms-of-service caveat. Gated behind the
 * `copilot-provider` feature flag, which defaults to off.
 *
 * The reason this is an auth strategy rather than a whole provider: models.dev
 * already lists `github-copilot` with `npm: "@ai-sdk/openai-compatible"` and its
 * API base URL, so the models and the transport come from the registry like any
 * other provider. Only the credential is unusual — a long-lived `gho_…` OAuth
 * token (persisted) exchanged for a ~30 minute bearer (memory only).
 *
 * That bearer is why {@link resolve} returns a `fetch` rather than an `apiKey`:
 * a turn is up to 32 sequential requests over several minutes, so a credential
 * captured once at model-construction time can expire mid-loop.
 */
export class CopilotDeviceFlowAuth implements AuthStrategy {
	/** The provider id this strategy handles, per models.dev. */
	static readonly providerId = PROVIDER_IDS.githubCopilot;

	private readonly tokens = new CopilotTokenCache(async () => {
		const settings = await readAgentSettings();
		return settings.credentials[PROVIDER_IDS.githubCopilot]?.oauthToken;
	});

	isConfigured = async (providerId: string): Promise<boolean> => {
		const settings = await readAgentSettings();
		return Boolean(settings.credentials[providerId]?.oauthToken);
	};

	resolve = async (): Promise<ResolvedAuth> => {
		// Resolve once to learn the base URL. Copilot Enterprise and proxied
		// accounts get their own host, returned by the token exchange, so it beats
		// the registry's default.
		const { apiBaseUrl } = await this.tokens.get();
		return {
			baseUrl: apiBaseUrl,
			headers: {
				...COPILOT_EDITOR_HEADERS,
			},
			fetch: this.authedFetch,
		};
	};

	signOut = async (providerId: string): Promise<void> => {
		await clearProviderCredential(providerId);
		this.tokens.invalidate();
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
		await updateProviderCredential(PROVIDER_IDS.githubCopilot, () => ({
			oauthToken,
			account: login,
		}));
		this.tokens.invalidate();
		return {
			login,
		};
	};

	/**
	 * Injects a *fresh* bearer per request, so a mid-turn refresh needs no
	 * rebuild of the model.
	 */
	private authedFetch: typeof fetch = async (input, init) => {
		const { token } = await this.tokens.get();
		const headers = new Headers(init?.headers);
		headers.set("authorization", `Bearer ${token}`);
		// Copilot rejects repeated request ids; the SDK doesn't set one.
		headers.set("x-request-id", crypto.randomUUID());
		return fetch(input, {
			...init,
			headers,
		});
	};
}
