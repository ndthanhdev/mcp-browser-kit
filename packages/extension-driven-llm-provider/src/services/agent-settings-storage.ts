import { localStorageArea } from "./storage-area";

/** `chrome.storage.local` key the agent settings live under. */
export const AGENT_SETTINGS_STORAGE_KEY = "mbk.agent.settings";

/** Provider ids that get special handling somewhere in this package. */
export const PROVIDER_IDS = {
	openrouter: "openrouter",
	/** models.dev's id for GitHub Copilot — note the hyphen, not "copilot". */
	githubCopilot: "github-copilot",
} as const;

/**
 * Credentials for one provider.
 *
 * A loose bag rather than a per-provider type: providers come from the
 * models.dev registry at runtime, so the set of ids is not known at compile
 * time. Which fields matter is decided by that provider's auth strategy.
 */
export interface ProviderCredential {
	/** Bearer token for the ~185 providers that authenticate with a plain key. */
	apiKey?: string;
	/**
	 * GitHub OAuth token from the device flow, used directly as the Copilot
	 * bearer. Persisted because it is long-lived: the App is registered with
	 * user-token expiry disabled, so there is no refresh token to manage.
	 */
	oauthToken?: string;
	/** Account label for display, e.g. the GitHub login. */
	account?: string;
	/**
	 * GitHub Enterprise host this credential belongs to, absent for github.com.
	 * Stored per credential because it selects the Copilot API host, and the
	 * public API — unlike the old token exchange — does not report it back.
	 */
	enterpriseDomain?: string;
}

/** A provider the user defined by hand — Ollama, LM Studio, a company proxy. */
export interface CustomProvider {
	id: string;
	name: string;
	/** OpenAI-compatible base URL, e.g. `http://localhost:11434/v1`. */
	baseUrl: string;
	/** Model ids to offer. Discovered from `GET {baseUrl}/models` when empty. */
	modelIds?: string[];
}

/** Shape persisted under {@link AGENT_SETTINGS_STORAGE_KEY}. */
export interface AgentSettings {
	/** Keyed by provider id — registry ids and custom ids share the namespace. */
	credentials: Record<string, ProviderCredential>;
	/**
	 * The chosen model as a composite `"<providerId>:<modelId>"` id. Model ids
	 * are only unique within a provider — several providers expose a `gpt-4o`.
	 */
	selectedModel?: string;
	customProviders: CustomProvider[];
}

/** Pre-registry shape: a single OpenRouter key. */
interface LegacyV1Settings {
	openRouterApiKey?: string;
	modelId?: string;
}

/** Fixed-shape credential slice, before providers became registry-driven. */
interface LegacyV2Settings {
	credentials?: {
		openrouter?: {
			apiKey?: string;
		};
		copilot?: {
			oauthToken?: string;
			login?: string;
		};
	};
	selectedModel?: string;
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
		// Split on the FIRST colon only: model ids may contain more
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
	customProviders: [],
});

/**
 * Bring older persisted shapes forward.
 *
 * Kept rather than dropped: silently discarding credentials signs a user out
 * with no error explaining why, and re-entering an API key is a worse
 * experience than a few lines of mapping. Two hops so far — the original
 * single-key shape, and the fixed per-provider slice that predates the
 * registry.
 */
const migrate = (value: Record<string, unknown>): AgentSettings => {
	// Already current.
	if ("customProviders" in value && "credentials" in value) {
		return value as unknown as AgentSettings;
	}

	// v2 → v3: fixed slice becomes an id-keyed record, and `copilot` takes
	// models.dev's id so registry lookups resolve.
	if ("credentials" in value) {
		const legacy = value as LegacyV2Settings;
		const credentials: Record<string, ProviderCredential> = {};
		if (legacy.credentials?.openrouter?.apiKey) {
			credentials[PROVIDER_IDS.openrouter] = {
				apiKey: legacy.credentials.openrouter.apiKey,
			};
		}
		if (legacy.credentials?.copilot?.oauthToken) {
			credentials[PROVIDER_IDS.githubCopilot] = {
				oauthToken: legacy.credentials.copilot.oauthToken,
				account: legacy.credentials.copilot.login,
			};
		}
		return {
			credentials,
			// The old id prefix was `copilot`; the registry calls it `github-copilot`.
			selectedModel: legacy.selectedModel?.startsWith("copilot:")
				? `${PROVIDER_IDS.githubCopilot}:${legacy.selectedModel.slice("copilot:".length)}`
				: legacy.selectedModel,
			customProviders: [],
		};
	}

	// v1 → v3.
	const legacy = value as LegacyV1Settings;
	return {
		credentials: legacy.openRouterApiKey
			? {
					[PROVIDER_IDS.openrouter]: {
						apiKey: legacy.openRouterApiKey,
					},
				}
			: {},
		selectedModel: legacy.modelId
			? toCompositeModelId(PROVIDER_IDS.openrouter, legacy.modelId)
			: undefined,
		customProviders: [],
	};
};

/** Read the persisted agent settings, migrating older shapes if present. */
export async function readAgentSettings(): Promise<AgentSettings> {
	const record = await localStorageArea().get(AGENT_SETTINGS_STORAGE_KEY);
	const value = record[AGENT_SETTINGS_STORAGE_KEY];
	if (!value || typeof value !== "object") {
		return emptySettings();
	}
	const migrated = migrate(value as Record<string, unknown>);
	return {
		...migrated,
		credentials: migrated.credentials ?? {},
		customProviders: migrated.customProviders ?? [],
	};
}

/** Persist the agent settings wholesale. */
export async function writeAgentSettings(
	settings: AgentSettings,
): Promise<void> {
	await localStorageArea().set({
		[AGENT_SETTINGS_STORAGE_KEY]: settings,
	});
}

/**
 * Read-modify-write one provider's credential, leaving everything else alone.
 *
 * The settings page and a device flow can both be writing, and a wholesale
 * write from either would clobber the other.
 */
export async function updateProviderCredential(
	providerId: string,
	update: (current: ProviderCredential) => ProviderCredential,
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const next: AgentSettings = {
		...settings,
		credentials: {
			...settings.credentials,
			[providerId]: update(settings.credentials[providerId] ?? {}),
		},
	};
	await writeAgentSettings(next);
	return next;
}

/** Forget a provider's credential entirely. */
export async function clearProviderCredential(
	providerId: string,
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const { [providerId]: _removed, ...rest } = settings.credentials;
	const next: AgentSettings = {
		...settings,
		credentials: rest,
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

/** Add or replace a custom provider, matched on id. */
export async function upsertCustomProvider(
	provider: CustomProvider,
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const others = settings.customProviders.filter(
		(candidate) => candidate.id !== provider.id,
	);
	const next: AgentSettings = {
		...settings,
		customProviders: [
			...others,
			provider,
		],
	};
	await writeAgentSettings(next);
	return next;
}

/** Remove a custom provider and its credential. */
export async function removeCustomProvider(
	providerId: string,
): Promise<AgentSettings> {
	const settings = await readAgentSettings();
	const { [providerId]: _removed, ...credentials } = settings.credentials;
	const next: AgentSettings = {
		...settings,
		credentials,
		customProviders: settings.customProviders.filter(
			(candidate) => candidate.id !== providerId,
		),
	};
	await writeAgentSettings(next);
	return next;
}
