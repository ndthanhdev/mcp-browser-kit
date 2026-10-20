import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
	type LlmProviderDescriptor,
	LlmProviderOutputPort,
	type LlmProviderOutputPort as LlmProviderOutputPortType,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { LanguageModel } from "ai";
import { type Container, injectable } from "inversify";
import {
	type Connection,
	parseCompositeModelId,
	readAgentSettings,
	toCompositeModelId,
} from "./agent-settings-storage";
import { fetchModelIds } from "./model-list";

/** How long a connection's `/models` answer is reused. */
const MODEL_LIST_TTL_MS = 5 * 60 * 1000;

/**
 * Driven adapter realizing {@link LlmProviderOutputPortType} over user-defined
 * OpenAI-compatible connections.
 *
 * Every connection goes through `@ai-sdk/openai-compatible`. Port ids are
 * composite `"<connectionId>:<modelId>"`, because model ids are only unique
 * within a connection.
 */
@injectable()
export class DrivenLlmProvider implements LlmProviderOutputPortType {
	static setupContainer(container: Container): void {
		container
			.bind<LlmProviderOutputPortType>(LlmProviderOutputPort)
			.to(DrivenLlmProvider);
	}

	private readonly modelCache = new Map<
		string,
		{
			key: string;
			at: number;
			modelIds: string[];
		}
	>();

	/** Models from every connection, discovered live with the manual list as fallback. */
	listProviders = async (): Promise<LlmProviderDescriptor[]> => {
		const { connections } = await readAgentSettings();
		const lists = await Promise.all(
			connections.map(async (connection) => ({
				connection,
				modelIds: await this.modelIdsFor(connection),
			})),
		);
		return lists.flatMap(({ connection, modelIds }) =>
			modelIds.map((modelId) => ({
				id: toCompositeModelId(connection.id, modelId),
				label: `${modelId} · ${connection.name}`,
			})),
		);
	};

	getModel = async (providerId?: string): Promise<LanguageModel> => {
		const settings = await readAgentSettings();
		const composite =
			providerId ??
			settings.selectedModel ??
			(await this.listProviders())[0]?.id;
		if (!composite) {
			throw new Error(
				"No language model is configured. Open the extension settings to add a connection and choose a model.",
			);
		}
		const parsed = parseCompositeModelId(composite);
		if (!parsed) {
			throw new Error(
				`Malformed model id "${composite}" — expected "<connection>:<model>".`,
			);
		}
		const connection = settings.connections.find(
			(candidate) => candidate.id === parsed.connectionId,
		);
		if (!connection) {
			throw new Error(
				`The connection "${parsed.connectionId}" no longer exists. Open the extension settings and choose another model.`,
			);
		}
		return createOpenAICompatible({
			name: connection.id,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: connection.baseUrl,
			apiKey: connection.apiKey,
			headers: connection.headers,
		})(parsed.modelId);
	};

	private modelIdsFor = async (connection: Connection): Promise<string[]> => {
		// Re-fetch when anything that affects the answer changes.
		const key = JSON.stringify([
			connection.baseUrl,
			connection.apiKey,
			connection.headers,
		]);
		const cached = this.modelCache.get(connection.id);
		if (
			cached &&
			cached.key === key &&
			Date.now() - cached.at < MODEL_LIST_TTL_MS
		) {
			return cached.modelIds;
		}
		const result = await fetchModelIds(connection);
		if (result.status === "ok" && result.modelIds.length > 0) {
			this.modelCache.set(connection.id, {
				key,
				at: Date.now(),
				modelIds: result.modelIds,
			});
			return result.modelIds;
		}
		return connection.models ?? [];
	};
}
