import type { LlmProviderDescriptor } from "@mcp-browser-kit/core-extension";
import {
	type AgentSettings,
	type Connection,
	DrivenLlmProvider,
	fetchModelIds,
	type ModelListResult,
	readAgentSettings,
	removeConnection,
	upsertConnection,
	writeSelectedModel,
} from "@mcp-browser-kit/extension-driven-llm-provider";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Settings state for the sidepanel, read from the extension storage it shares
 * with the background.
 */
export const useAgentSettings = () => {
	const provider = useRef(new DrivenLlmProvider()).current;

	const [settings, setSettings] = useState<AgentSettings>();
	const [models, setModels] = useState<LlmProviderDescriptor[]>([]);
	const [modelsLoading, setModelsLoading] = useState(false);

	const reload = useCallback(async () => {
		setSettings(await readAgentSettings());
		setModelsLoading(true);
		try {
			setModels(await provider.listProviders());
		} finally {
			setModelsLoading(false);
		}
	}, [
		provider,
	]);

	useEffect(() => {
		void reload();
	}, [
		reload,
	]);

	const saveConnection = useCallback(
		async (connection: Connection) => {
			await upsertConnection(connection);
			await reload();
		},
		[
			reload,
		],
	);

	const deleteConnection = useCallback(
		async (connectionId: string) => {
			await removeConnection(connectionId);
			await reload();
		},
		[
			reload,
		],
	);

	const selectModel = useCallback(async (compositeModelId: string) => {
		setSettings(await writeSelectedModel(compositeModelId));
	}, []);

	const testConnection = useCallback(
		(
			connection: Pick<Connection, "baseUrl" | "apiKey">,
		): Promise<ModelListResult> => fetchModelIds(connection),
		[],
	);

	return {
		/** `undefined` until the first read completes. */
		settings,
		models,
		modelsLoading,
		saveConnection,
		deleteConnection,
		selectModel,
		testConnection,
	};
};
