// biome-ignore-all lint/style/useNamingConvention: these build GitHub's snake_case JSON wire format verbatim.

/**
 * Builders for the GitHub / Copilot JSON payloads the Copilot provider parses.
 *
 * Tests use these instead of inline object literals so the snake_case
 * suppression lives in one place, and so a wire-shape change breaks a single
 * file rather than every spec.
 */

/** A `Response` carrying a JSON body, as `fetch` would return. */
export const jsonResponse = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
	});

/** `POST /login/device/code` success payload. */
export const deviceCodeResponse = (
	overrides: {
		userCode?: string;
		verificationUri?: string;
		deviceCode?: string;
		intervalSeconds?: number;
		expiresInSeconds?: number;
	} = {},
): Record<string, unknown> => ({
	user_code: overrides.userCode ?? "ABCD-1234",
	verification_uri:
		overrides.verificationUri ?? "https://github.com/login/device",
	device_code: overrides.deviceCode ?? "dc",
	...(overrides.intervalSeconds === undefined
		? {}
		: {
				interval: overrides.intervalSeconds,
			}),
	...(overrides.expiresInSeconds === undefined
		? {}
		: {
				expires_in: overrides.expiresInSeconds,
			}),
});

/** A partial `POST /login/device/code` payload, for the incomplete-response case. */
export const partialDeviceCodeResponse = (): Record<string, unknown> => ({
	user_code: "ABCD-1234",
});

/** `POST /login/oauth/access_token` success payload. */
export const accessTokenResponse = (
	token: string,
): Record<string, unknown> => ({
	access_token: token,
});

/** `POST /login/oauth/access_token` error payload, optionally with a new interval. */
export const accessTokenErrorResponse = (
	error: string,
	intervalSeconds?: number,
): Record<string, unknown> => ({
	error,
	...(intervalSeconds === undefined
		? {}
		: {
				interval: intervalSeconds,
			}),
});

/** `GET /copilot_internal/v2/token` success payload. `expiresAtSeconds` is epoch seconds. */
export const copilotTokenResponse = (
	options: {
		token?: string;
		expiresAtSeconds?: number;
		apiBaseUrl?: string;
	} = {},
): Record<string, unknown> => ({
	token: options.token ?? "t",
	...(options.expiresAtSeconds === undefined
		? {}
		: {
				expires_at: options.expiresAtSeconds,
			}),
	...(options.apiBaseUrl === undefined
		? {}
		: {
				endpoints: {
					api: options.apiBaseUrl,
				},
			}),
});

/** One entry of `GET <api>/models`, defaulting to a usable chat model. */
export const copilotModelEntry = (
	id: string,
	options: {
		name?: string | null;
		type?: string;
		toolCalls?: boolean | null;
		pickerEnabled?: boolean;
		omitId?: boolean;
	} = {},
): Record<string, unknown> => ({
	...(options.omitId
		? {}
		: {
				id,
			}),
	...(options.name === null
		? {}
		: {
				name: options.name ?? id.toUpperCase(),
			}),
	capabilities: {
		type: options.type ?? "chat",
		supports:
			options.toolCalls === null
				? {}
				: {
						tool_calls: options.toolCalls ?? true,
					},
	},
	...(options.pickerEnabled === undefined
		? {}
		: {
				model_picker_enabled: options.pickerEnabled,
			}),
});
