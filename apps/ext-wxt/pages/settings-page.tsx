import { SettingsScreen } from "@/components/screens/settings-screen";
import { useAgentSettings } from "@/hooks/use-agent-settings";
import { useBooleanFlag } from "@/hooks/use-boolean-flag";
import { hrefs } from "@/routes/paths";

/** Provider credentials and model selection, wired to extension storage. */
export const SettingsPage = () => {
	const {
		settings,
		providers,
		configuredProviders,
		catalogStatus,
		catalogError,
		signIn,
		search,
		retryCatalog,
		saveApiKey,
		selectModel,
		probeCustomProvider,
		saveCustomProvider,
		deleteCustomProvider,
		startCopilotSignIn,
		cancelCopilotSignIn,
		signOutProvider,
	} = useAgentSettings();

	// `undefined` while the flag provider starts — treat as off so the
	// ToS-sensitive section never flashes into view before being hidden.
	const copilotEnabled = useBooleanFlag("copilot-provider") ?? false;
	const copilotCredential = settings?.credentials["github-copilot"];

	return (
		<SettingsScreen
			backHref={hrefs.home}
			providers={providers}
			configuredProviderIds={configuredProviders.map((provider) => provider.id)}
			selectedModel={settings?.selectedModel}
			catalogStatus={catalogStatus}
			catalogError={catalogError}
			copilotEnabled={copilotEnabled}
			copilotAccount={copilotCredential?.account}
			copilotConfigured={Boolean(copilotCredential?.oauthToken)}
			copilotSignIn={signIn}
			search={search}
			onRetryCatalog={() => {
				void retryCatalog();
			}}
			onSaveApiKey={(providerId, apiKey) => {
				void saveApiKey(providerId, apiKey);
			}}
			onSelectModel={(providerId, modelId) => {
				void selectModel(providerId, modelId);
			}}
			onSignOut={(providerId) => {
				void signOutProvider(providerId);
			}}
			onProbeCustom={probeCustomProvider}
			onSaveCustom={(provider, apiKey) => {
				void saveCustomProvider(provider).then(() => {
					if (apiKey) {
						void saveApiKey(provider.id, apiKey);
					}
				});
			}}
			onRemoveCustom={(providerId) => {
				void deleteCustomProvider(providerId);
			}}
			onCopilotSignIn={() => {
				void startCopilotSignIn();
			}}
			onCopilotCancel={cancelCopilotSignIn}
		/>
	);
};
