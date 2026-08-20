import {
	type AgentSettings,
	CopilotProvider,
	type DeviceCodeGrant,
	DeviceFlowError,
	type LlmModelDescriptor,
	OpenRouterProvider,
	PROVIDER_IDS,
	readAgentSettings,
	toCompositeModelId,
	updateProviderCredentials,
	writeSelectedModel,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import { useCallback, useEffect, useRef, useState } from "react";

/** One provider's section in the settings screen. */
export interface ProviderState {
	id: string;
	label: string;
	configured: boolean;
	/** Empty until the provider is configured. */
	models: LlmModelDescriptor[];
	/** Set when listing models failed — e.g. an expired or unentitled token. */
	error?: string;
}

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

/**
 * Settings state for the sidepanel.
 *
 * Deliberately talks to the provider package *directly* rather than through the
 * agent RPC. Credentials live in `chrome.storage.local`, which both contexts
 * share, so storage — not the background's provider instance — is the source of
 * truth. Routing sign-in through the background would add a second RPC surface
 * and a second thing to keep in sync, and would keep the service worker alive
 * for the whole minutes-long device flow.
 */
export const useAgentSettings = () => {
	// One instance per mount. Model lists are cached on the strategy, so keeping
	// them across renders avoids re-listing on every keystroke.
	const openRouter = useRef(new OpenRouterProvider()).current;
	const copilot = useRef(new CopilotProvider()).current;

	const [settings, setSettings] = useState<AgentSettings>();
	const [providers, setProviders] = useState<ProviderState[]>([]);
	const [signIn, setSignIn] = useState<CopilotSignInState>({
		status: "idle",
	});
	const signInAbort = useRef<AbortController>(undefined);

	const refresh = useCallback(async () => {
		const current = await readAgentSettings();
		setSettings(current);

		const described = await Promise.all(
			[
				openRouter,
				copilot,
			].map(async (strategy): Promise<ProviderState> => {
				const configured = await strategy.isConfigured();
				if (!configured) {
					return {
						id: strategy.id,
						label: strategy.label,
						configured,
						models: [],
					};
				}
				try {
					return {
						id: strategy.id,
						label: strategy.label,
						configured,
						models: await strategy.listModels(),
					};
				} catch (error) {
					// Surface it rather than hiding the provider: an expired Copilot
					// token looks identical to "not signed in" otherwise, and the user
					// needs to know to sign in again.
					return {
						id: strategy.id,
						label: strategy.label,
						configured,
						models: [],
						error: error instanceof Error ? error.message : String(error),
					};
				}
			}),
		);
		setProviders(described);
	}, [
		openRouter,
		copilot,
	]);

	useEffect(() => {
		void refresh();
	}, [
		refresh,
	]);

	// Abort an in-flight device flow if the panel closes mid-sign-in.
	useEffect(
		() => () => {
			signInAbort.current?.abort();
		},
		[],
	);

	const saveOpenRouterKey = useCallback(
		async (apiKey: string) => {
			await updateProviderCredentials(PROVIDER_IDS.openrouter, () => ({
				apiKey: apiKey.trim() || undefined,
			}));
			await refresh();
		},
		[
			refresh,
		],
	);

	const selectModel = useCallback(
		async (providerId: string, modelId: string) => {
			await writeSelectedModel(toCompositeModelId(providerId, modelId));
			await refresh();
		},
		[
			refresh,
		],
	);

	const startCopilotSignIn = useCallback(async () => {
		setSignIn({
			status: "starting",
		});
		const abort = new AbortController();
		signInAbort.current = abort;

		try {
			const grant = await copilot.beginSignIn();
			setSignIn({
				status: "awaiting-authorization",
				grant,
			});
			await copilot.completeSignIn(grant, abort.signal);
			setSignIn({
				status: "idle",
			});
			await refresh();
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
	}, [
		copilot,
		refresh,
	]);

	const cancelCopilotSignIn = useCallback(() => {
		signInAbort.current?.abort();
		setSignIn({
			status: "idle",
		});
	}, []);

	const signOutCopilot = useCallback(async () => {
		await copilot.signOut();
		setSignIn({
			status: "idle",
		});
		await refresh();
	}, [
		copilot,
		refresh,
	]);

	return {
		/** `undefined` until the first read completes. */
		settings,
		providers,
		signIn,
		saveOpenRouterKey,
		selectModel,
		startCopilotSignIn,
		cancelCopilotSignIn,
		signOutCopilot,
	};
};
