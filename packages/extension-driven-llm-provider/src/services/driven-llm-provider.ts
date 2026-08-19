import {
	type LlmProviderDescriptor,
	LlmProviderOutputPort,
	type LlmProviderOutputPort as LlmProviderOutputPortType,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { LanguageModel } from "ai";
import { type Container, injectable, multiInject } from "inversify";
import {
	parseCompositeModelId,
	readAgentSettings,
	toCompositeModelId,
} from "./agent-settings-storage";
import type { LlmProviderStrategy } from "./providers/llm-provider-strategy";
import { OpenRouterProvider } from "./providers/openrouter-provider";

/** Multi-inject token collecting every registered {@link LlmProviderStrategy}. */
export const LlmProviderStrategyToken = Symbol("LlmProviderStrategy");

/**
 * Driven adapter realizing {@link LlmProviderOutputPortType} as a *registry* over
 * several {@link LlmProviderStrategy} implementations rather than a single
 * hardcoded vendor.
 *
 * The port speaks in flat `providerId` strings; this adapter treats those as
 * composite `"<providerId>:<modelId>"` ids, because model ids are only unique
 * within a provider (both OpenRouter and Copilot expose a `gpt-4o`). That keeps
 * the port — and therefore `BrowserAgentUseCase` — unaware that more than one
 * vendor exists.
 *
 * Pure JS (no sandbox/subprocess), so it runs in the MV3 background service
 * worker. Credentials and the selected model are read from extension storage
 * (`chrome.storage.local` via `webextension-polyfill`), written by the settings
 * page in `apps/ext-wxt`.
 */
@injectable()
export class DrivenLlmProvider implements LlmProviderOutputPortType {
	/**
	 * Bind the registry and its default strategies. Providers that are gated
	 * (e.g. Copilot) are bound by the composition root instead, so an app can
	 * decide which vendors it ships.
	 */
	static setupContainer(container: Container): void {
		container
			.bind<LlmProviderStrategy>(LlmProviderStrategyToken)
			.to(OpenRouterProvider);
		container
			.bind<LlmProviderOutputPortType>(LlmProviderOutputPort)
			.to(DrivenLlmProvider);
	}

	constructor(
		@multiInject(LlmProviderStrategyToken)
		private readonly strategies: LlmProviderStrategy[],
	) {}

	private strategyById = (
		providerId: string,
	): LlmProviderStrategy | undefined =>
		this.strategies.find((strategy) => strategy.id === providerId);

	/**
	 * Every model across every *configured* provider, as composite ids.
	 *
	 * A provider that throws while listing (expired token, network down) is
	 * skipped rather than failing the whole list — otherwise one broken vendor
	 * hides the working ones and the settings UI shows nothing.
	 */
	listProviders = async (): Promise<LlmProviderDescriptor[]> => {
		const perProvider = await Promise.all(
			this.strategies.map(async (strategy) => {
				try {
					if (!(await strategy.isConfigured())) {
						return [];
					}
					const models = await strategy.listModels();
					return models.map((model) => ({
						id: toCompositeModelId(strategy.id, model.id),
						label: `${model.label} · ${strategy.label}`,
					}));
				} catch {
					return [];
				}
			}),
		);
		return perProvider.flat();
	};

	getModel = async (providerId?: string): Promise<LanguageModel> => {
		const composite = providerId ?? (await this.resolveSelectedModel());
		if (!composite) {
			throw new Error(
				"No language model is configured. Open the extension settings to sign in to a provider.",
			);
		}
		const parsed = parseCompositeModelId(composite);
		if (!parsed) {
			throw new Error(
				`Malformed model id "${composite}" — expected "<provider>:<model>".`,
			);
		}
		const strategy = this.strategyById(parsed.providerId);
		if (!strategy) {
			throw new Error(`Unknown LLM provider "${parsed.providerId}".`);
		}
		return strategy.createModel(parsed.modelId);
	};

	/**
	 * The persisted selection, or the first configured provider's default. The
	 * fallback matters on first run after signing in: the user has credentials
	 * but has not opened the model dropdown yet.
	 */
	private async resolveSelectedModel(): Promise<string | undefined> {
		const { selectedModel } = await readAgentSettings();
		if (selectedModel) {
			return selectedModel;
		}
		for (const strategy of this.strategies) {
			if (!(await strategy.isConfigured())) {
				continue;
			}
			const modelId = await strategy.defaultModelId();
			if (modelId) {
				return toCompositeModelId(strategy.id, modelId);
			}
		}
		return undefined;
	}
}
