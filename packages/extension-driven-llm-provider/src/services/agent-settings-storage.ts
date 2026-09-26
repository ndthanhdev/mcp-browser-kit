import browser from "webextension-polyfill";

/**
 * `chrome.storage.local` key the agent settings live under.
 *
 * Versioned in the key rather than migrated: older shapes are ignored, so
 * upgrading resets the settings.
 */
export const AGENT_SETTINGS_STORAGE_KEY = "mbk.agent.settings.v4";

/** One OpenAI-compatible endpoint the agent can call. */
export interface Connection {
	/** Unique slug; the prefix of composite model ids. */
	id: string;
	name: string;
	/** OpenAI-compatible base URL, e.g. `https://api.openai.com/v1`. */
	baseUrl: string;
	/** Sent as a bearer token. Optional for local servers. */
	apiKey?: string;
	/** Extra headers sent with every request. */
	headers?: Record<string, string>;
	/** Model ids to offer when `GET {baseUrl}/models` is unavailable. */
	models?: string[];
}

/** Shape persisted under {@link AGENT_SETTINGS_STORAGE_KEY}. */
export interface AgentSettings {
	connections: Connection[];
	/** The chosen model as a composite `"<connectionId>:<modelId>"` id. */
	selectedModel?: string;
}

/** Split a composite `"<connectionId>:<modelId>"` id. */
export const parseCompositeModelId = (
	composite: string,
):
	| {
			connectionId: string;
			modelId: string;
	  }
	| undefined => {
	const separator = composite.indexOf(":");
	if (separator <= 0 || separator === composite.length - 1) {
		return undefined;
	}
	return {
		connectionId: composite.slice(0, separator),
		// Split on the first colon only: model ids may contain more
		// (e.g. `llama3:8b`).
		modelId: composite.slice(separator + 1),
	};
};

/** Build a composite `"<connectionId>:<modelId>"` id. */
export const toCompositeModelId = (
	connectionId: string,
	modelId: string,
): string => `${connectionId}:${modelId}`;

const emptySettings = (): AgentSettings => ({
	connections: [],
});

/** Read the persisted agent settings. */
export async function readAgentSettings(): Promise<AgentSettings> {
	const record = await browser.storage.local.get(AGENT_SETTINGS_STORAGE_KEY);
	const value = record[AGENT_SETTINGS_STORAGE_KEY] as
		| Partial<AgentSettings>
		| undefined;
	if (!value || typeof value !== "object") {
		return emptySettings();
	}
	return {
		connections: Array.isArray(value.connections) ? value.connections : [],
		selectedModel: value.selectedModel,
	};
}

/** Persist the agent settings wholesale. */
export async function writeAgentSettings(
	settings: AgentSettings,
): Promise<void> {
	await browser.storage.local.set({
		[AGENT_SETTINGS_STORAGE_KEY]: settings,
	});
}

const updateSettings = async (
	update: (settings: AgentSettings) => AgentSettings,
): Promise<AgentSettings> => {
	const next = update(await readAgentSettings());
	await writeAgentSettings(next);
	return next;
};

/** Add or replace a connection, matched on id. */
export const upsertConnection = (
	connection: Connection,
): Promise<AgentSettings> =>
	updateSettings((settings) => {
		const index = settings.connections.findIndex(
			(candidate) => candidate.id === connection.id,
		);
		const connections = [
			...settings.connections,
		];
		if (index === -1) {
			connections.push(connection);
		} else {
			connections[index] = connection;
		}
		return {
			...settings,
			connections,
		};
	});

/** Remove a connection, clearing the selection if it pointed there. */
export const removeConnection = (
	connectionId: string,
): Promise<AgentSettings> =>
	updateSettings((settings) => ({
		connections: settings.connections.filter(
			(candidate) => candidate.id !== connectionId,
		),
		selectedModel:
			settings.selectedModel &&
			parseCompositeModelId(settings.selectedModel)?.connectionId ===
				connectionId
				? undefined
				: settings.selectedModel,
	}));

/** Persist the selected composite model id. */
export const writeSelectedModel = (
	compositeModelId: string | undefined,
): Promise<AgentSettings> =>
	updateSettings((settings) => ({
		...settings,
		selectedModel: compositeModelId,
	}));
