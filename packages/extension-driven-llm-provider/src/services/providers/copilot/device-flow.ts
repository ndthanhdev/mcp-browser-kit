import {
	COPILOT_CLIENT_ID,
	COPILOT_DEVICE_FLOW_TIMEOUT_MS,
	COPILOT_OAUTH_SCOPE,
	GITHUB_ACCESS_TOKEN_URL,
	GITHUB_DEVICE_CODE_URL,
	GITHUB_USER_URL,
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

const jsonHeaders = {
	accept: "application/json",
	"content-type": "application/json",
};

/**
 * Start a device flow. The caller shows {@link DeviceCodeGrant.userCode} and
 * {@link DeviceCodeGrant.verificationUri} to the user, then calls
 * {@link pollForAccessToken}.
 */
export const requestDeviceCode = async (
	fetchImpl: typeof fetch = fetch,
): Promise<DeviceCodeGrant> => {
	const response = await fetchImpl(GITHUB_DEVICE_CODE_URL, {
		method: "POST",
		headers: jsonHeaders,
		body: deviceCodeRequestBody(COPILOT_CLIENT_ID, COPILOT_OAUTH_SCOPE),
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
	} = {},
): Promise<string> => {
	const {
		signal,
		fetchImpl = fetch,
		sleepImpl = sleep,
		now = Date.now,
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

		const response = await fetchImpl(GITHUB_ACCESS_TOKEN_URL, {
			method: "POST",
			headers: jsonHeaders,
			body: accessTokenRequestBody(COPILOT_CLIENT_ID, grant.deviceCode),
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
	fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> => {
	const response = await fetchImpl(GITHUB_USER_URL, {
		headers: {
			authorization: `token ${oauthToken}`,
			accept: "application/vnd.github+json",
		},
	});
	if (!response.ok) {
		return undefined;
	}
	const body = (await response.json()) as GithubUserResponse;
	return body.login;
};
