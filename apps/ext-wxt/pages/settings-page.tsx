import { SettingsScreen } from "@/components/screens/settings-screen";
import { useAgentSettings } from "@/hooks/use-agent-settings";
import { useBooleanFlag } from "@/hooks/use-boolean-flag";
import { hrefs } from "@/routes/paths";

/** Provider credentials and model selection, wired to extension storage. */
export const SettingsPage = () => {
	const {
		settings,
		providers,
		signIn,
		saveOpenRouterKey,
		selectModel,
		startCopilotSignIn,
		cancelCopilotSignIn,
		signOutCopilot,
	} = useAgentSettings();
	// `undefined` while the flag provider starts — treat as off so the
	// ToS-sensitive section never flashes into view before being hidden.
	const copilotEnabled = useBooleanFlag("copilot-provider") ?? false;

	return (
		<SettingsScreen
			backHref={hrefs.home}
			providers={providers}
			selectedModel={settings?.selectedModel}
			openRouterApiKey={settings?.credentials.openrouter?.apiKey}
			copilotEnabled={copilotEnabled}
			copilotLogin={settings?.credentials.copilot?.login}
			copilotSignIn={signIn}
			onSaveOpenRouterKey={(apiKey) => {
				void saveOpenRouterKey(apiKey);
			}}
			onSelectModel={(providerId, modelId) => {
				void selectModel(providerId, modelId);
			}}
			onCopilotSignIn={() => {
				void startCopilotSignIn();
			}}
			onCopilotCancel={cancelCopilotSignIn}
			onCopilotSignOut={() => {
				void signOutCopilot();
			}}
		/>
	);
};
