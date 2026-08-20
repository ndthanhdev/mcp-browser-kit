import { SettingsScreen } from "@/components/screens/settings-screen";
import { useAgentSettings } from "@/hooks/use-agent-settings";
import { useBooleanFlag } from "@/hooks/use-boolean-flag";
import { hrefs } from "@/routes/paths";

/** Provider credentials and model selection, wired to extension storage. */
export const SettingsPage = () => {
	const {
		settings,
		providers,
		availableModels,
		signIn,
		saveApiKey,
		selectModel,
		startCopilotSignIn,
		cancelCopilotSignIn,
		signOutProvider,
	} = useAgentSettings();
	// `undefined` while the flag provider starts — treat as off so the
	// ToS-sensitive section never flashes into view before being hidden.
	const copilotEnabled = useBooleanFlag("copilot-provider") ?? false;

	return (
		<SettingsScreen
			backHref={hrefs.home}
			providers={providers}
			models={availableModels.map((entry) => ({
				providerId: entry.provider.id,
				modelId: entry.model.id,
				label: `${entry.model.name} · ${entry.provider.name}`,
			}))}
			selectedModel={settings?.selectedModel}
			openRouterApiKey={settings?.credentials.openrouter?.apiKey}
			copilotEnabled={copilotEnabled}
			copilotLogin={settings?.credentials["github-copilot"]?.account}
			copilotSignIn={signIn}
			onSaveOpenRouterKey={(apiKey) => {
				void saveApiKey("openrouter", apiKey);
			}}
			onSelectModel={(providerId, modelId) => {
				void selectModel(providerId, modelId);
			}}
			onCopilotSignIn={() => {
				void startCopilotSignIn();
			}}
			onCopilotCancel={cancelCopilotSignIn}
			onCopilotSignOut={() => {
				void signOutProvider("github-copilot");
			}}
		/>
	);
};
