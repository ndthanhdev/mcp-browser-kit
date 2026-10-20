import type { Connection } from "./agent-settings-storage";

export type ModelListResult =
	| {
			status: "ok";
			modelIds: string[];
	  }
	| {
			status: "failed";
			message: string;
	  };

const trimSlash = (url: string): string => url.replace(/\/+$/, "");

/** Check that a base URL is an absolute http(s) URL. Returns an error message. */
export const validateBaseUrl = (baseUrl: string): string | undefined => {
	try {
		const url = new URL(baseUrl);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return "Use an http:// or https:// URL.";
		}
		return undefined;
	} catch {
		return "Not a valid URL.";
	}
};

/** Headers for a request to a connection. */
export const connectionHeaders = (
	connection: Pick<Connection, "apiKey" | "headers">,
): Record<string, string> => ({
	...(connection.apiKey
		? {
				// biome-ignore lint/style/useNamingConvention: HTTP header name.
				Authorization: `Bearer ${connection.apiKey}`,
			}
		: {}),
	...connection.headers,
});

const MAX_REASON_LENGTH = 200;

/**
 * The provider's own explanation from an error body. Covers the common shapes:
 * `{error: {message}}`, `{error: "..."}`, `{detail}` and `{message}`, falling
 * back to the raw text.
 */
const errorReason = (text: string): string | undefined => {
	let reason: unknown = text;
	try {
		const body = JSON.parse(text) as {
			error?:
				| string
				| {
						message?: unknown;
				  };
			detail?: unknown;
			message?: unknown;
		};
		reason =
			(typeof body.error === "object" ? body.error?.message : body.error) ??
			body.detail ??
			body.message ??
			text;
	} catch {
		// Not JSON: use the text as is.
	}
	if (typeof reason !== "string") {
		return undefined;
	}
	const trimmed = reason.replace(/\s+/g, " ").trim();
	return trimmed ? trimmed.slice(0, MAX_REASON_LENGTH) : undefined;
};

const httpFailure = async (response: Response): Promise<string> => {
	const status = `${response.status} ${response.statusText}`.trim();
	const reason = errorReason(await response.text().catch(() => ""));
	return reason
		? `The endpoint answered ${status}: ${reason}`
		: `The endpoint answered ${status}.`;
};

const networkFailure = (baseUrl: string, error: unknown): string => {
	const detail = error instanceof Error ? error.message : String(error);
	let origin = baseUrl;
	try {
		origin = new URL(baseUrl).origin;
	} catch {
		// Keep the raw value; validateBaseUrl reports the problem.
	}
	return `Could not reach ${origin} (${detail}). Check the URL and that the server is running.`;
};

/**
 * Ask an endpoint which models it serves, via `GET {baseUrl}/models`.
 *
 * Never throws: a failure is reported as a result so the settings page can
 * show it next to the connection.
 */
export const fetchModelIds = async (
	connection: Pick<Connection, "baseUrl" | "apiKey"> &
		Partial<Pick<Connection, "headers">>,
	fetchImpl: typeof fetch = fetch,
): Promise<ModelListResult> => {
	let response: Response;
	try {
		response = await fetchImpl(`${trimSlash(connection.baseUrl)}/models`, {
			headers: connectionHeaders(connection),
		});
	} catch (error) {
		return {
			status: "failed",
			message: networkFailure(connection.baseUrl, error),
		};
	}
	try {
		if (!response.ok) {
			return {
				status: "failed",
				message: await httpFailure(response),
			};
		}
		const body = (await response.json()) as {
			data?: {
				id?: unknown;
			}[];
		};
		const modelIds = (body.data ?? [])
			.map((model) => model.id)
			.filter((id): id is string => typeof id === "string")
			.sort((a, b) => a.localeCompare(b));
		return {
			status: "ok",
			modelIds,
		};
	} catch (error) {
		return {
			status: "failed",
			message: error instanceof Error ? error.message : String(error),
		};
	}
};
