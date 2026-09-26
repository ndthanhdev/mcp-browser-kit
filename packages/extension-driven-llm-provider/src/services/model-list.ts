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
	try {
		const response = await fetchImpl(
			`${trimSlash(connection.baseUrl)}/models`,
			{
				headers: connectionHeaders(connection),
			},
		);
		if (!response.ok) {
			return {
				status: "failed",
				message:
					`The endpoint answered ${response.status} ${response.statusText}.`.trim(),
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
