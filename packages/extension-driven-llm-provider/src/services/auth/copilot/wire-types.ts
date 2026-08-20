// biome-ignore-all lint/style/useNamingConvention: these mirror GitHub's snake_case JSON wire format verbatim.

/**
 * The GitHub / Copilot JSON payloads this package parses, kept in one file.
 *
 * Every property here is snake_case because that is what the server sends;
 * isolating them means the naming-convention suppression is declared once
 * rather than at ~24 call sites, and there is a single place to look when an
 * endpoint's shape changes. Nothing outside `providers/copilot` should import
 * these — the modules that parse them return camelCase domain types.
 */

/** `POST https://github.com/login/device/code` */
export interface DeviceCodeResponse {
	user_code?: string;
	verification_uri?: string;
	device_code?: string;
	interval?: number;
	expires_in?: number;
}

/** `POST https://github.com/login/oauth/access_token` */
export interface AccessTokenResponse {
	access_token?: string;
	/**
	 * `authorization_pending` | `slow_down` | `expired_token` | `access_denied`,
	 * or anything else GitHub decides to add.
	 */
	error?: string;
	/** New minimum poll interval, sent alongside `slow_down`. */
	interval?: number;
}

/** `GET https://api.github.com/user` */
export interface GithubUserResponse {
	login?: string;
}

/** `GET https://api.github.com/copilot_internal/v2/token` */
export interface CopilotTokenResponse {
	token?: string;
	/** Epoch **seconds**, not milliseconds. */
	expires_at?: number;
	endpoints?: {
		api?: string;
	};
}

/** One entry of `GET <api>/models`. */
export interface CopilotModelEntry {
	id?: string;
	name?: string;
	/** `false` marks internal/deprecated aliases the official picker hides. */
	model_picker_enabled?: boolean;
	capabilities?: {
		/** `chat`, `embeddings`, … */
		type?: string;
		supports?: {
			tool_calls?: boolean;
		};
	};
}

/** `GET <api>/models` */
export interface CopilotModelsResponse {
	data?: CopilotModelEntry[];
}

// --- Request bodies ---

/** Body for `POST https://github.com/login/device/code`. */
export const deviceCodeRequestBody = (
	clientId: string,
	scope: string,
): string =>
	JSON.stringify({
		client_id: clientId,
		scope,
	});

/** Body for `POST https://github.com/login/oauth/access_token`. */
export const accessTokenRequestBody = (
	clientId: string,
	deviceCode: string,
): string =>
	JSON.stringify({
		client_id: clientId,
		device_code: deviceCode,
		grant_type: "urn:ietf:params:oauth:grant-type:device_code",
	});
