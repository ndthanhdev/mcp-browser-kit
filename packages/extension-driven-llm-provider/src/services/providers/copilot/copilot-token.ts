import {
	COPILOT_DEFAULT_API_BASE_URL,
	COPILOT_EDITOR_HEADERS,
	COPILOT_TOKEN_EXCHANGE_URL,
	COPILOT_TOKEN_REFRESH_SKEW_MS,
} from "./constants";
import type { CopilotTokenResponse } from "./wire-types";

/** A short-lived Copilot bearer plus the base URL it is valid against. */
export interface CopilotToken {
	token: string;
	/** Epoch milliseconds. */
	expiresAt: number;
	/**
	 * Base URL for chat requests. Copilot Enterprise and proxied accounts get a
	 * different host, so this is read from the exchange response rather than
	 * hardcoded.
	 */
	apiBaseUrl: string;
}

/** Raised when the OAuth token is present but Copilot won't issue a bearer. */
export class CopilotEntitlementError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CopilotEntitlementError";
	}
}

/**
 * Caches the short-lived Copilot bearer derived from a long-lived `gho_…` OAuth
 * token.
 *
 * Deliberately in-memory only: the bearer lasts ~30 minutes, and persisting it
 * to `chrome.storage.local` would widen the credential's exposure for no gain —
 * it is cheap to re-mint from the OAuth token that IS persisted.
 *
 * Refresh is single-flight. An agent turn is a tool loop of up to 32 sequential
 * requests, and the first few can be in flight together; without this, an
 * expiry would fire several identical exchanges and burn rate limit.
 */
export class CopilotTokenCache {
	private cached?: CopilotToken;
	private inFlight?: Promise<CopilotToken>;

	constructor(
		private readonly readOauthToken: () => Promise<string | undefined>,
		private readonly fetchImpl: typeof fetch = fetch,
		private readonly now: () => number = Date.now,
	) {}

	/** Drop the cached bearer — call on sign-out. */
	invalidate = (): void => {
		this.cached = undefined;
		this.inFlight = undefined;
	};

	/**
	 * A bearer that is valid for at least {@link COPILOT_TOKEN_REFRESH_SKEW_MS}
	 * more, minting a new one if needed.
	 */
	get = async (): Promise<CopilotToken> => {
		if (
			this.cached &&
			this.cached.expiresAt - COPILOT_TOKEN_REFRESH_SKEW_MS > this.now()
		) {
			return this.cached;
		}
		this.inFlight ??= this.exchange().finally(() => {
			this.inFlight = undefined;
		});
		return this.inFlight;
	};

	private async exchange(): Promise<CopilotToken> {
		const oauthToken = await this.readOauthToken();
		if (!oauthToken) {
			throw new Error(
				"Not signed in to GitHub Copilot. Open the extension settings to sign in.",
			);
		}

		const response = await this.fetchImpl(COPILOT_TOKEN_EXCHANGE_URL, {
			headers: {
				authorization: `token ${oauthToken}`,
				accept: "application/json",
				...COPILOT_EDITOR_HEADERS,
			},
		});

		if (response.status === 401 || response.status === 403) {
			// The OAuth token is fine but the account can't use Copilot — a revoked
			// authorization, or no active subscription. Distinguished from a
			// transport error so the settings UI can tell the user to check their
			// subscription rather than retry.
			throw new CopilotEntitlementError(
				"GitHub declined to issue a Copilot token. Check that this account has an active Copilot subscription, then sign in again.",
			);
		}
		if (!response.ok) {
			throw new Error(`Copilot token exchange failed (${response.status}).`);
		}

		const body = (await response.json()) as CopilotTokenResponse;
		if (!body.token) {
			throw new Error("Copilot token exchange returned no token.");
		}

		this.cached = {
			token: body.token,
			// `expires_at` is epoch *seconds*. Absent → assume the observed ~30min
			// lifetime, which the skew above then shortens to a safe ~25.
			expiresAt: body.expires_at
				? body.expires_at * 1000
				: this.now() + 30 * 60 * 1000,
			apiBaseUrl: body.endpoints?.api ?? COPILOT_DEFAULT_API_BASE_URL,
		};
		return this.cached;
	}
}
