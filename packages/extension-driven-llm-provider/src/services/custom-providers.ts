import type { CustomProvider } from "./agent-settings-storage";

/** `GET {baseUrl}/models` — the OpenAI list-models response. */
interface OpenAiModelsResponse {
	data?: Array<{
		id?: string;
	}>;
}

/** Outcome of probing a custom provider, for the settings form. */
export type ProbeResult =
	| {
			status: "ok";
			modelIds: string[];
	  }
	| {
			status: "failed";
			message: string;
	  };

/** Strip a trailing slash so `${baseUrl}/models` never doubles it. */
export const normalizeBaseUrl = (baseUrl: string): string =>
	baseUrl.trim().replace(/\/+$/, "");

/**
 * Validate a base URL the way the extension will actually use it.
 *
 * Rejects anything that isn't http(s) — a `ws://` or bare host would fail much
 * later, inside the SDK, with a far worse error.
 */
export const validateBaseUrl = (baseUrl: string): string | undefined => {
	const trimmed = baseUrl.trim();
	if (!trimmed) {
		return "Enter a base URL.";
	}
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return "That is not a valid URL.";
	}
	if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
		return "The base URL must start with http:// or https://.";
	}
	return undefined;
};

/**
 * Ask an OpenAI-compatible server which models it has.
 *
 * models.dev cannot help here: a local Ollama or LM Studio instance holds
 * whatever the user pulled, and a company proxy exposes whatever it proxies. The
 * server itself is the only source of truth, and `GET /models` is the one
 * endpoint every OpenAI-compatible implementation provides.
 *
 * Note this lists *all* models, with no way to tell which support tool calling —
 * `/models` carries no capability data. Registry providers are filtered on
 * `tool_call`; these cannot be, so the settings UI warns instead.
 */
export const discoverModels = async (
	baseUrl: string,
	apiKey?: string,
	fetchImpl: typeof fetch = fetch,
	signal?: AbortSignal,
): Promise<ProbeResult> => {
	const invalid = validateBaseUrl(baseUrl);
	if (invalid) {
		return {
			status: "failed",
			message: invalid,
		};
	}

	try {
		const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/models`, {
			signal,
			headers: apiKey
				? {
						authorization: `Bearer ${apiKey}`,
					}
				: {},
		});
		if (!response.ok) {
			return {
				status: "failed",
				message: `The server answered ${response.status} at /models.`,
			};
		}

		const body = (await response.json()) as OpenAiModelsResponse;
		const modelIds = (body.data ?? [])
			.map((entry) => entry.id)
			.filter((id): id is string => Boolean(id));

		if (modelIds.length === 0) {
			return {
				status: "failed",
				message:
					"The server listed no models. For a local server, load a model first.",
			};
		}
		return {
			status: "ok",
			modelIds: modelIds.sort(),
		};
	} catch (error) {
		// The overwhelmingly common case is a local server that isn't running, so
		// say that rather than surfacing a bare "Failed to fetch".
		return {
			status: "failed",
			message:
				error instanceof Error && error.name === "AbortError"
					? "Cancelled."
					: `Could not reach ${baseUrl}. Check the server is running and the URL is right.`,
		};
	}
};

/** Build a provider record from a settings form, normalising as it goes. */
export const toCustomProvider = (input: {
	id: string;
	name: string;
	baseUrl: string;
	modelIds?: string[];
}): CustomProvider => ({
	id: input.id.trim(),
	name: input.name.trim() || input.id.trim(),
	baseUrl: normalizeBaseUrl(input.baseUrl),
	modelIds: input.modelIds,
});

/**
 * Whether an id can be used for a custom provider.
 *
 * Colons are banned because composite model ids are `"<provider>:<model>"` and
 * split on the first colon — an id containing one would be silently truncated.
 */
export const validateProviderId = (
	id: string,
	taken: readonly string[],
): string | undefined => {
	const trimmed = id.trim();
	if (!trimmed) {
		return "Enter an id.";
	}
	if (trimmed.includes(":")) {
		return "Ids cannot contain a colon.";
	}
	if (!/^[a-z0-9][a-z0-9._-]*$/i.test(trimmed)) {
		return "Use letters, digits, dots, dashes or underscores.";
	}
	if (taken.includes(trimmed)) {
		return `"${trimmed}" is already in use.`;
	}
	return undefined;
};
