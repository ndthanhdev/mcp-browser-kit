import browser from "webextension-polyfill";

/** `chrome.storage.local` key the agent settings live under. */
export const AGENT_SETTINGS_STORAGE_KEY = "mbk.agent.settings";

/** Stable ids for the providers the registry can serve. */
export const PROVIDER_IDS = {
	openrouter: "openrouter",
	copilot: "copilot",
} as const;

export type ProviderId = (typeof PROVIDER_IDS)[keyof typeof PROVIDER_IDS];

/** Per-provider credentials. Each provider reads only its own slice. */
export interface ProviderCredentials {
	/** OpenRouter API key (https://openrouter.ai/keys). */
	openrouter?: {
		apiKey?: string;
	};
	/**
	 * The long-lived GitHub OAuth token (`gho_…`) from the device flow. The
	 * short-lived Copilot bearer derived from it is deliberately NOT persisted —
	 * it lives in memory only (see `providers/copilot/copilot-token.ts`).
	 */
	copilot?: {
		oauthToken?: string;
		/** GitHub login of the signed-in account, for display in settings. */
		login?: string;
	};
}

/** Shape persisted under {@link AGENT_SETTINGS_STORAGE_KEY}. */
export interface AgentSettings {
	credentials: ProviderCredentials;
	/**
	 * The chosen model as a composite `"<providerId>:<modelId>"` id — model ids
	 * are only unique within a provider (both OpenRouter and Copilot expose a
	 * `gpt-4o`). Absent → the registry picks the first configured provider's
	 * default.
	 */
	selectedModel?: string;
}

/** Legacy single-provider shape, migrated on read. */
interface LegacyAgentSettings {
	openRouterApiKey?: string;
	modelId?: string;
}

/** A model offered by one provider, before composite-id qualification. */
export interface LlmModelDescriptor {
	/** Provider-local model id (e.g. `anthropic/claude-opus-4.1`, `gpt-4o`). */
	id: string;
	/** Human-facing label. */
	label: string;
}

/** Split a composite `"<providerId>:<modelId>"` id. */
export const parseCompositeModelId = (
	composite: string,
):
	| {
			providerId: string;
			modelId: string;
	  }
	| undefined => {
	const separator = composite.indexOf(":");
	if (separator <= 0 || separator === composite.length - 1) {
		return undefined;
	}
	return {
		providerId: composite.slice(0, separator),
		// Split on the FIRST colon only: OpenRouter slugs may contain more
		// (e.g. `openai/gpt-4o:extended`).
		modelId: composite.slice(separator + 1),
	};
};

/** Build a composite `"<providerId>:<modelId>"` id. */
export const toCompositeModelId = (
	providerId: string,
	modelId: string,
): string => `${providerId}:${modelId}`;

const emptySettings = (): AgentSettings => ({
	credentials: {},
});

/**
 * Migrate the pre-registry `{ openRouterApiKey, modelId }` shape. Kept
 * indefinitely-ish: it is a handful of lines and dropping it silently signs
 * users out of OpenRouter with no error to explain why.
 */
const migrate = (value: Record<string, unknown>): AgentSettings => {
	if ("credentials" in value) {
		return value as unknown as AgentSettings;
	}
	const legacy = value as LegacyAgentSettings;
	return {
		credentials: legacy.openRouterApiKey
			? {
					openrouter: {
						apiKey: legacy.openRouterApiKey,
					},
				}
			: {},
		selectedModel: legacy.modelId
			? toCompositeModelId(PROVIDER_IDS.openrouter, legacy.modelId)
			: undefined,
	};
};

/** Read the persisted agent settings, migrating the legacy shape if present. */
export async function readAgentSettings(): Promise<AgentSettings> {
	const record = await browser.storage.local.get(AGENT_SETTINGS_STORAGE_KEY);
	const value = record[AGENT_SETTINGS_STORAGE_KEY];
	if (!value || typeof value !== "object") {
		return emptySettings();
	}
	return migrate(value as Record<string, unknown>);
}

/** Persist the agent settings wholesale. */
export async function writeAgentSettings(
	settings: AgentSettings,
): Promise<void> {
	await browser.storage.local.set({
		[AGENT_SETTINGS_STORAGE_KEY]: settings,
	});
}

/**
 * Read-modify-write one provider's credential slice, leaving the others (and
 * `selectedModel`) untouched. The settings page and the device flow both write
 * concurrently-ish, and a wholesale `writeAgentSettings` from either would
 * clobber the other.
 */
export async function updateProviderCredentials<K extends ProviderId>(
	providerId: K,
	update: (
		current: NonNullable<ProviderCredentials[K]>,
	) => ProviderCredentials[K],
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const next: AgentSettings = {
		...settings,
		credentials: {
			...settings.credentials,
			[providerId]: update(
				(settings.credentials[providerId] ?? {}) as NonNullable<
					ProviderCredentials[K]
				>,
			),
		},
	};
	await writeAgentSettings(next);
	return next;
}

/** Persist the selected composite model id, leaving credentials untouched. */
export async function writeSelectedModel(
	compositeModelId: string | undefined,
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const next: AgentSettings = {
		...settings,
		selectedModel: compositeModelId,
	};
	await writeAgentSettings(next);
	return next;
}
