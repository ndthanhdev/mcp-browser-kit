import {
	COPILOT_CLIENT_ID,
	COPILOT_DEVICE_FLOW_TIMEOUT_MS,
	COPILOT_OAUTH_SCOPE,
	COPILOT_USER_AGENT,
	githubAccessTokenUrl,
	githubDeviceCodeUrl,
	githubUserUrl,
} from "./constants";
import {
	type AccessTokenResponse,
	accessTokenRequestBody,
	type DeviceCodeResponse,
	deviceCodeRequestBody,
	type GithubUserResponse,
} from "./wire-types";

/** What the user must be shown to authorize the extension. */
export interface DeviceCodeGrant {
	/** Code the user types into GitHub, e.g. `ABCD-1234`. */
	userCode: string;
	/** Page the user opens to enter {@link userCode}. */
	verificationUri: string;
	/** Opaque handle the poll step exchanges for a token. */
	deviceCode: string;
	/** Minimum seconds between polls, per GitHub. */
	intervalSeconds: number;
	/** Seconds until {@link deviceCode} stops being redeemable. */
	expiresInSeconds: number;
}

/** Reasons a device flow can end without a token. */
export type DeviceFlowFailure =
	/** The user let the code expire. */
	| "expired"
	/** The user explicitly declined on github.com. */
	| "denied"
	/** Our own backstop timeout elapsed. */
	| "timeout"
	/** The caller aborted (settings page closed, sign-in cancelled). */
	| "cancelled";

/** Thrown by {@link pollForAccessToken} when the flow ends without a token. */
export class DeviceFlowError extends Error {
	constructor(
		readonly failure: DeviceFlowFailure,
		message: string,
	) {
		super(message);
		this.name = "DeviceFlowError";
	}
}

/**
 * `user-agent` identifies this extension to GitHub. The device flow works
 * without it, but sending it keeps every request in this directory honestly
 * attributed rather than only the Copilot ones.
 */
const jsonHeaders = {
	accept: "application/json",
	"content-type": "application/json",
	"user-agent": COPILOT_USER_AGENT,
};

/**
 * Start a device flow. The caller shows {@link DeviceCodeGrant.userCode} and
 * {@link DeviceCodeGrant.verificationUri} to the user, then calls
 * {@link pollForAccessToken}.
 */
export const requestDeviceCode = async (
	options: {
		/** GitHub Enterprise host; omit for github.com. */
		domain?: string;
		fetchImpl?: typeof fetch;
		/** Overridable so tests can exercise an unconfigured build. */
		clientId?: string;
	} = {},
): Promise<DeviceCodeGrant> => {
	const { domain, fetchImpl = fetch, clientId = COPILOT_CLIENT_ID } = options;
	const response = await fetchImpl(githubDeviceCodeUrl(domain), {
		method: "POST",
		headers: jsonHeaders,
		body: deviceCodeRequestBody(clientId, COPILOT_OAUTH_SCOPE),
	});
	if (!response.ok) {
		throw new Error(
			`GitHub rejected the device-code request (${response.status}).`,
		);
	}
	const body = (await response.json()) as DeviceCodeResponse;
	if (!(body.user_code && body.verification_uri && body.device_code)) {
		throw new Error("GitHub returned an incomplete device-code response.");
	}
	return {
		userCode: body.user_code,
		verificationUri: body.verification_uri,
		deviceCode: body.device_code,
		intervalSeconds: body.interval ?? 5,
		expiresInSeconds: body.expires_in ?? 900,
	};
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DeviceFlowError("cancelled", "Sign-in was cancelled."));
		};
		if (signal?.aborted) {
			onAbort();
			return;
		}
		signal?.addEventListener("abort", onAbort, {
			once: true,
		});
	});

/**
 * Poll GitHub until the user authorizes the device code, then return the
 * long-lived `gho_…` OAuth token.
 *
 * GitHub drives the cadence: `authorization_pending` means keep going at the
 * current interval, and `slow_down` means we polled too fast and must back off —
 * ignoring it gets the flow rejected outright.
 */
export const pollForAccessToken = async (
	grant: DeviceCodeGrant,
	options: {
		signal?: AbortSignal;
		fetchImpl?: typeof fetch;
		/** Injected in tests so polling doesn't actually wait. */
		sleepImpl?: (ms: number, signal?: AbortSignal) => Promise<void>;
		now?: () => number;
		/** GitHub Enterprise host; omit for github.com. */
		domain?: string;
		/** Overridable so tests can exercise an unconfigured build. */
		clientId?: string;
	} = {},
): Promise<string> => {
	const {
		signal,
		fetchImpl = fetch,
		sleepImpl = sleep,
		now = Date.now,
		domain,
		clientId = COPILOT_CLIENT_ID,
	} = options;

	let intervalMs = grant.intervalSeconds * 1000;
	const deadline =
		now() +
		Math.min(grant.expiresInSeconds * 1000, COPILOT_DEVICE_FLOW_TIMEOUT_MS);

	while (true) {
		if (signal?.aborted) {
			throw new DeviceFlowError("cancelled", "Sign-in was cancelled.");
		}
		if (now() >= deadline) {
			throw new DeviceFlowError(
				"timeout",
				"Timed out waiting for GitHub authorization.",
			);
		}

		await sleepImpl(intervalMs, signal);

		const response = await fetchImpl(githubAccessTokenUrl(domain), {
			method: "POST",
			headers: jsonHeaders,
			body: accessTokenRequestBody(clientId, grant.deviceCode),
		});
		const body = (await response.json()) as AccessTokenResponse;

		if (body.access_token) {
			return body.access_token;
		}

		switch (body.error) {
			case "authorization_pending":
				break;
			case "slow_down":
				// GitHub suggests a new interval; if it doesn't, back off ourselves.
				intervalMs =
					(body.interval ? body.interval : grant.intervalSeconds + 5) * 1000;
				break;
			case "expired_token":
				throw new DeviceFlowError(
					"expired",
					"The GitHub device code expired. Start the sign-in again.",
				);
			case "access_denied":
				throw new DeviceFlowError(
					"denied",
					"GitHub authorization was declined.",
				);
			default:
				throw new Error(
					`GitHub device flow failed: ${body.error ?? `HTTP ${response.status}`}`,
				);
		}
	}
};

/** Look up the signed-in GitHub login, for display in settings. */
export const fetchGithubLogin = async (
	oauthToken: string,
	options: {
		/** GitHub Enterprise host; omit for github.com. */
		domain?: string;
		fetchImpl?: typeof fetch;
	} = {},
): Promise<string | undefined> => {
	const { domain, fetchImpl = fetch } = options;
	const response = await fetchImpl(githubUserUrl(domain), {
		headers: {
			authorization: `Bearer ${oauthToken}`,
			accept: "application/vnd.github+json",
			"user-agent": COPILOT_USER_AGENT,
		},
	});
	if (!response.ok) {
		return undefined;
	}
	const body = (await response.json()) as GithubUserResponse;
	return body.login;
};
