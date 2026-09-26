import { SettingsScreen } from "@/components/screens/settings-screen";
import { useAgentSettings } from "@/hooks/use-agent-settings";
import { hrefs } from "@/routes/paths";

/** Connections and model selection, wired to extension storage. */
export const SettingsPage = () => {
	const {
		settings,
		models,
		modelsLoading,
		saveConnection,
		deleteConnection,
		selectModel,
		testConnection,
	} = useAgentSettings();

	return (
		<SettingsScreen
			backHref={hrefs.home}
			connections={settings?.connections ?? []}
			models={models}
			modelsLoading={modelsLoading}
			selectedModel={settings?.selectedModel}
			onSelectModel={(id) => {
				void selectModel(id);
			}}
			onTestConnection={testConnection}
			onSaveConnection={(connection) => {
				void saveConnection(connection);
			}}
			onDeleteConnection={(id) => {
				void deleteConnection(id);
			}}
		/>
	);
};
