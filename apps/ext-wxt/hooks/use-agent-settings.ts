import {
	type AgentSettings,
	type Catalog,
	type CatalogEntry,
	CopilotDeviceFlowAuth,
	type CustomProvider,
	type DeviceCodeGrant,
	DeviceFlowError,
	discoverModels,
	ModelCatalog,
	PROVIDER_IDS,
	type ProbeResult,
	type ResolvedProvider,
	readAgentSettings,
	removeCustomProvider,
	searchCatalog,
	toCompositeModelId,
	updateProviderCredential,
	upsertCustomProvider,
	writeSelectedModel,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Where the catalog fetch has got to, so the UI can be honest about it. */
export type CatalogStatus = "loading" | "ready" | "error";

/** Where the Copilot device flow has got to. */
export type CopilotSignInState =
	| {
			status: "idle";
	  }
	| {
			status: "starting";
	  }
	| {
			status: "awaiting-authorization";
			grant: DeviceCodeGrant;
	  }
	| {
			status: "failed";
			message: string;
	  };

/** A provider row in the settings list. */
export interface ProviderRow extends ResolvedProvider {
	configured: boolean;
	modelCount: number;
}

/**
 * Settings state for the sidepanel.
 *
 * Talks to the provider package directly rather than through the agent RPC:
 * credentials and the catalog both live in `chrome.storage.local`, which the
 * sidepanel and background share, so storage is the source of truth. Routing
 * this through the background would add a second RPC surface to keep in sync
 * and would pin the service worker alive for the whole minutes-long device flow.
 */
export const useAgentSettings = () => {
	const catalog = useRef(new ModelCatalog()).current;
	const copilot = useRef(new CopilotDeviceFlowAuth()).current;

	const [settings, setSettings] = useState<AgentSettings>();
	const [registry, setRegistry] = useState<Catalog>();
	const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
	const [catalogError, setCatalogError] = useState<string>();
	const [signIn, setSignIn] = useState<CopilotSignInState>({
		status: "idle",
	});
	const signInAbort = useRef<AbortController>(undefined);

	const reloadSettings = useCallback(async () => {
		setSettings(await readAgentSettings());
	}, []);

	const loadCatalog = useCallback(
		async (force = false) => {
			setCatalogStatus("loading");
			setCatalogError(undefined);
			try {
				setRegistry(force ? await catalog.forceRefresh() : await catalog.get());
				setCatalogStatus("ready");
			} catch (error) {
				// The picker is unusable without this, so say so rather than
				// rendering an empty list that looks like "no providers exist".
				setCatalogError(error instanceof Error ? error.message : String(error));
				setCatalogStatus("error");
			}
		},
		[
			catalog,
		],
	);

	useEffect(() => {
		void reloadSettings();
		void loadCatalog();
	}, [
		reloadSettings,
		loadCatalog,
	]);

	// Abort an in-flight device flow if the panel closes mid-sign-in.
	useEffect(
		() => () => {
			signInAbort.current?.abort();
		},
		[],
	);

	/** Every provider, registry and custom, with its configured state. */
	const providers = useMemo((): ProviderRow[] => {
		const credentials = settings?.credentials ?? {};
		const fromRegistry = Object.values(registry ?? {}).map(
			(provider): ProviderRow => ({
				id: provider.id,
				name: provider.name,
				npm: provider.npm,
				api: provider.api,
				doc: provider.doc,
				custom: false,
				configured: Boolean(
					credentials[provider.id]?.apiKey ||
						credentials[provider.id]?.oauthToken,
				),
				modelCount: provider.models.length,
			}),
		);
		const fromCustom = (settings?.customProviders ?? []).map(
			(provider): ProviderRow => ({
				id: provider.id,
				name: provider.name,
				npm: "@ai-sdk/openai-compatible",
				api: provider.baseUrl,
				custom: true,
				configured: true,
				modelCount: provider.modelIds?.length ?? 0,
			}),
		);
		return [
			...fromRegistry,
			...fromCustom,
		].sort((a, b) => a.name.localeCompare(b.name));
	}, [
		registry,
		settings,
	]);

	/** Configured providers first — what the user is most likely to want. */
	const configuredProviders = useMemo(
		() => providers.filter((provider) => provider.configured),
		[
			providers,
		],
	);

	/** Models the user can actually call right now, for the model picker. */
	const availableModels = useMemo((): CatalogEntry[] => {
		if (!(registry && settings)) {
			return [];
		}
		const configured = new Set(
			configuredProviders.map((provider) => provider.id),
		);
		return Object.values(registry)
			.filter((provider) => configured.has(provider.id))
			.flatMap((provider) =>
				provider.models.map((model) => ({
					provider,
					model,
				})),
			);
	}, [
		registry,
		settings,
		configuredProviders,
	]);

	/** Search the whole registry, for browsing before signing in anywhere. */
	const search = useCallback(
		(query: string, limit?: number): CatalogEntry[] =>
			registry ? searchCatalog(registry, query, limit) : [],
		[
			registry,
		],
	);

	const saveApiKey = useCallback(
		async (providerId: string, apiKey: string) => {
			await updateProviderCredential(providerId, (current) => ({
				...current,
				apiKey: apiKey.trim() || undefined,
			}));
			await reloadSettings();
		},
		[
			reloadSettings,
		],
	);

	const selectModel = useCallback(
		async (providerId: string, modelId: string) => {
			await writeSelectedModel(toCompositeModelId(providerId, modelId));
			await reloadSettings();
		},
		[
			reloadSettings,
		],
	);

	/**
	 * Ask a custom provider's server what it can run. Registry providers get
	 * their models from models.dev; a local server is its own source of truth.
	 */
	const probeCustomProvider = useCallback(
		async (baseUrl: string, apiKey?: string): Promise<ProbeResult> =>
			discoverModels(baseUrl, apiKey),
		[],
	);

	const saveCustomProvider = useCallback(
		async (provider: CustomProvider) => {
			await upsertCustomProvider(provider);
			await reloadSettings();
		},
		[
			reloadSettings,
		],
	);

	const deleteCustomProvider = useCallback(
		async (providerId: string) => {
			await removeCustomProvider(providerId);
			await reloadSettings();
		},
		[
			reloadSettings,
		],
	);

	const startCopilotSignIn = useCallback(
		async (enterpriseDomain?: string) => {
			setSignIn({
				status: "starting",
			});
			const abort = new AbortController();
			signInAbort.current = abort;

			try {
				const grant = await copilot.beginSignIn(enterpriseDomain);
				setSignIn({
					status: "awaiting-authorization",
					grant,
				});
				await copilot.completeSignIn(grant, {
					signal: abort.signal,
					enterpriseDomain,
				});
				setSignIn({
					status: "idle",
				});
				await reloadSettings();
			} catch (error) {
				if (error instanceof DeviceFlowError && error.failure === "cancelled") {
					setSignIn({
						status: "idle",
					});
					return;
				}
				setSignIn({
					status: "failed",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		},
		[
			copilot,
			reloadSettings,
		],
	);

	const cancelCopilotSignIn = useCallback(() => {
		signInAbort.current?.abort();
		setSignIn({
			status: "idle",
		});
	}, []);

	const signOutProvider = useCallback(
		async (providerId: string) => {
			if (providerId === PROVIDER_IDS.githubCopilot) {
				await copilot.signOut(providerId);
			} else {
				await updateProviderCredential(providerId, () => ({}));
			}
			await reloadSettings();
		},
		[
			copilot,
			reloadSettings,
		],
	);

	return {
		/** `undefined` until the first read completes. */
		settings,
		providers,
		configuredProviders,
		availableModels,
		catalogStatus,
		catalogError,
		signIn,
		search,
		retryCatalog: () => loadCatalog(true),
		saveApiKey,
		selectModel,
		probeCustomProvider,
		saveCustomProvider,
		deleteCustomProvider,
		startCopilotSignIn,
		cancelCopilotSignIn,
		signOutProvider,
	};
};
