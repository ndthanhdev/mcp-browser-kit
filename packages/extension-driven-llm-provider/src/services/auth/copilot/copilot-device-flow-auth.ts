import {
	clearProviderCredential,
	PROVIDER_IDS,
	readAgentSettings,
	updateProviderCredential,
} from "../../agent-settings-storage";
import type { AuthStrategy, ResolvedAuth } from "../auth-strategy";
import {
	COPILOT_CLIENT_ID,
	COPILOT_INITIATOR,
	COPILOT_REQUEST_HEADERS,
	copilotApiBaseUrl,
	hasCopilotClientId,
} from "./constants";
import {
	type DeviceCodeGrant,
	fetchGithubLogin,
	pollForAccessToken,
	requestDeviceCode,
} from "./device-flow";

/**
 * GitHub Copilot's device flow.
 *
 * The reason this is an auth strategy rather than a whole provider: models.dev
 * already lists `github-copilot` with `npm: "@ai-sdk/openai-compatible"` and its
 * API base URL, so the models and the transport come from the registry like any
 * other provider. Only the credential is unusual.
 *
 * The credential is the user's GitHub OAuth token, used directly as the bearer.
 * An earlier version exchanged it at `copilot_internal/v2/token` for a ~30
 * minute bearer, which is why this class once needed a token cache and a
 * refresh skew; the public API accepts the OAuth token as-is, so all of that is
 * gone.
 *
 * {@link resolve} still returns a `fetch` rather than an `apiKey`, for a
 * different reason than before: each request needs its own `x-request-id`, and
 * Copilot wants the initiator classified per request.
 */
export class CopilotDeviceFlowAuth implements AuthStrategy {
	/** The provider id this strategy handles, per models.dev. */
	static readonly providerId = PROVIDER_IDS.githubCopilot;

	/**
	 * Whether the build can offer Copilot at all. Separate from
	 * {@link isConfigured}, which is about the user having signed in.
	 */
	static isAvailable = (): boolean => hasCopilotClientId();

	/**
	 * Injected so tests can exercise an unconfigured build without reaching for
	 * a module mock; production always uses the shipped id.
	 */
	constructor(private readonly clientId: string = COPILOT_CLIENT_ID) {}

	isConfigured = async (providerId: string): Promise<boolean> => {
		if (!hasCopilotClientId(this.clientId)) {
			return false;
		}
		const settings = await readAgentSettings();
		return Boolean(settings.credentials[providerId]?.oauthToken);
	};

	resolve = async (): Promise<ResolvedAuth> => {
		const { enterpriseDomain } = await this.readCredential();
		return {
			baseUrl: copilotApiBaseUrl(enterpriseDomain),
			headers: {
				...COPILOT_REQUEST_HEADERS,
			},
			fetch: this.authedFetch,
		};
	};

	signOut = async (providerId: string): Promise<void> => {
		await clearProviderCredential(providerId);
	};

	// --- Sign-in ---

	/**
	 * Begin the GitHub device flow. Returns what the settings UI must display;
	 * the caller then awaits {@link completeSignIn} with the same grant.
	 *
	 * `enterpriseDomain` targets a GitHub Enterprise deployment; omit it for
	 * github.com.
	 */
	beginSignIn = async (enterpriseDomain?: string): Promise<DeviceCodeGrant> => {
		if (!hasCopilotClientId(this.clientId)) {
			throw new Error(
				"This build has no GitHub client id, so Copilot sign-in cannot start. " +
					"Set COPILOT_CLIENT_ID in auth/copilot/constants.ts.",
			);
		}
		return requestDeviceCode({
			domain: enterpriseDomain,
			clientId: this.clientId,
		});
	};

	/**
	 * Wait for the user to authorize on GitHub, then persist the resulting OAuth
	 * token, the account login, and which deployment it belongs to.
	 */
	completeSignIn = async (
		grant: DeviceCodeGrant,
		options: {
			signal?: AbortSignal;
			enterpriseDomain?: string;
		} = {},
	): Promise<{
		login?: string;
	}> => {
		const { signal, enterpriseDomain } = options;
		const oauthToken = await pollForAccessToken(grant, {
			signal,
			domain: enterpriseDomain,
			clientId: this.clientId,
		});
		const login = await fetchGithubLogin(oauthToken, {
			domain: enterpriseDomain,
		});
		await updateProviderCredential(PROVIDER_IDS.githubCopilot, () => ({
			oauthToken,
			account: login,
			enterpriseDomain,
		}));
		return {
			login,
		};
	};

	private readCredential = async (): Promise<{
		oauthToken?: string;
		enterpriseDomain?: string;
	}> => {
		const settings = await readAgentSettings();
		const credential = settings.credentials[PROVIDER_IDS.githubCopilot];
		return {
			oauthToken: credential?.oauthToken,
			enterpriseDomain: credential?.enterpriseDomain,
		};
	};

	/**
	 * Reads the token per request rather than capturing it once, so signing out
	 * mid-turn stops the next request instead of the turn continuing on a
	 * credential the user just revoked.
	 */
	private authedFetch: typeof fetch = async (input, init) => {
		const { oauthToken } = await this.readCredential();
		if (!oauthToken) {
			throw new Error("Not signed in to GitHub Copilot.");
		}
		const headers = new Headers(init?.headers);
		headers.set("authorization", `Bearer ${oauthToken}`);
		// Copilot rejects repeated request ids; the SDK doesn't set one.
		headers.set("x-request-id", crypto.randomUUID());
		headers.set("x-initiator", COPILOT_INITIATOR);
		return fetch(input, {
			...init,
			headers,
		});
	};
}
