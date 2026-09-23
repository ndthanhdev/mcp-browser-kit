import {
	type LlmProviderDescriptor,
	LlmProviderOutputPort,
	type LlmProviderOutputPort as LlmProviderOutputPortType,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { LanguageModel } from "ai";
import { type Container, injectable, unmanaged } from "inversify";
import {
	type CustomProvider,
	parseCompositeModelId,
	readAgentSettings,
	toCompositeModelId,
} from "./agent-settings-storage";
import { ApiKeyAuth } from "./auth/api-key-auth";
import type { AuthStrategy } from "./auth/auth-strategy";
import { COPILOT_MODELS_TTL_MS } from "./auth/copilot/constants";
import { CopilotDeviceFlowAuth } from "./auth/copilot/copilot-device-flow-auth";
import {
	type CopilotModel,
	fetchCopilotModels,
} from "./auth/copilot/copilot-models";
import type { CatalogProvider } from "./catalog/catalog-schema";
import { ModelCatalog } from "./catalog/model-catalog";
import { resolveBaseUrl } from "./factories/base-url-overrides";
import { factoryFor } from "./factories/provider-factories";

/** A provider the registry can serve, from the catalog or user-defined. */
export interface ResolvedProvider {
	id: string;
	name: string;
	npm: string;
	api?: string;
	doc?: string;
	/** True for user-defined providers, which the catalog knows nothing about. */
	custom: boolean;
}

/** Turn a user-defined provider into the same shape as a catalog entry. */
const fromCustom = (provider: CustomProvider): ResolvedProvider => ({
	id: provider.id,
	name: provider.name,
	// Custom providers are OpenAI-compatible by definition — that is the whole
	// contract the form asks the user to satisfy.
	npm: "@ai-sdk/openai-compatible",
	api: provider.baseUrl,
	custom: true,
});

const fromCatalog = (provider: CatalogProvider): ResolvedProvider => ({
	id: provider.id,
	name: provider.name,
	npm: provider.npm,
	api: provider.api,
	doc: provider.doc,
	custom: false,
});

/**
 * Driven adapter realizing {@link LlmProviderOutputPortType} over the models.dev
 * registry.
 *
 * Composes three independent axes so that adding a provider is *data*, not code:
 *
 * - **What exists** — {@link ModelCatalog}, the models.dev registry.
 * - **How to authenticate** — an {@link AuthStrategy}, keyed by provider id.
 *   Almost every provider is a plain API key; GitHub Copilot has a device flow.
 * - **How to build the model** — a factory keyed by the registry's `npm` field,
 *   defaulting to OpenAI-compatible, which covers 152 of ~190 providers.
 *
 * The port speaks in flat id strings; this adapter treats them as composite
 * `"<providerId>:<modelId>"`, because model ids are only unique within a
 * provider. `BrowserAgentUseCase` stays unaware that any of this exists.
 */
@injectable()
export class DrivenLlmProvider implements LlmProviderOutputPortType {
	static setupContainer(container: Container): void {
		container
			.bind<LlmProviderOutputPortType>(LlmProviderOutputPort)
			.to(DrivenLlmProvider);
	}

	private readonly apiKeyAuth = new ApiKeyAuth();
	private readonly copilotAuth = new CopilotDeviceFlowAuth();

	/**
	 * Last successful Copilot entitlement lookup. Memoized because
	 * {@link listProviders} runs on every settings render and the answer changes
	 * about as often as a subscription does.
	 */
	private copilotModels?: {
		at: number;
		models: CopilotModel[];
	};

	/**
	 * `@unmanaged()` is load-bearing. Vite emits `design:paramtypes`, so without
	 * it inversify sees a `ModelCatalog` parameter, tries to resolve a binding
	 * that was never registered, and throws — taking the whole background
	 * composition down with it. The container passes nothing and the default
	 * applies; tests still pass a catalog explicitly.
	 */
	constructor(
		@unmanaged() readonly catalog: ModelCatalog = new ModelCatalog(),
	) {}

	/** The auth strategy for a provider. Anything unlisted uses an API key. */
	authFor = (providerId: string): AuthStrategy =>
		providerId === CopilotDeviceFlowAuth.providerId
			? this.copilotAuth
			: this.apiKeyAuth;

	/** The Copilot flow, for the settings page's sign-in card. */
	get copilot(): CopilotDeviceFlowAuth {
		return this.copilotAuth;
	}

	/** Every provider the registry knows, plus the user's own. */
	listAllProviders = async (): Promise<ResolvedProvider[]> => {
		const settings = await readAgentSettings();
		const custom = settings.customProviders.map(fromCustom);
		const cataloged = (await this.catalog.peek()) ?? {};
		return [
			...Object.values(cataloged).map(fromCatalog),
			...custom,
		].sort((a, b) => a.name.localeCompare(b.name));
	};

	/** Resolve one provider by id, custom entries taking precedence. */
	resolveProvider = async (
		providerId: string,
	): Promise<ResolvedProvider | undefined> => {
		const settings = await readAgentSettings();
		const custom = settings.customProviders.find(
			(candidate) => candidate.id === providerId,
		);
		if (custom) {
			return fromCustom(custom);
		}
		const cataloged = await this.catalog.getProvider(providerId);
		return cataloged && fromCatalog(cataloged);
	};

	/**
	 * Models from every *configured* provider, as composite ids.
	 *
	 * Only configured providers: listing ~5,800 models the user cannot call would
	 * make the port useless to the agent. The settings page browses the full
	 * catalog separately.
	 */
	listProviders = async (): Promise<LlmProviderDescriptor[]> => {
		const settings = await readAgentSettings();
		const configuredIds = Object.keys(settings.credentials);
		const catalog = (await this.catalog.peek()) ?? {};
		const descriptors: LlmProviderDescriptor[] = [];

		const copilotModels = configuredIds.includes(
			CopilotDeviceFlowAuth.providerId,
		)
			? await this.liveCopilotModels()
			: undefined;

		for (const providerId of configuredIds) {
			const provider = catalog[providerId];
			if (!provider) {
				continue;
			}
			// Copilot is the one provider whose registry model ids cannot be used.
			// models.dev lists the current Copilot line-up while an account is
			// served an entirely different set — the two id namespaces do not
			// overlap at all, so a registry id reaches Copilot and comes back
			// "The requested model is not supported". When the account's own list
			// is unavailable, Copilot therefore contributes nothing rather than
			// falling back to ids that are guaranteed to fail.
			if (providerId === CopilotDeviceFlowAuth.providerId) {
				for (const model of copilotModels ?? []) {
					descriptors.push({
						id: toCompositeModelId(providerId, model.id),
						label: `${model.name} · ${provider.name}`,
					});
				}
				continue;
			}
			for (const model of provider.models) {
				descriptors.push({
					id: toCompositeModelId(providerId, model.id),
					label: `${model.name} · ${provider.name}`,
				});
			}
		}

		// Custom providers list whatever model ids the user recorded.
		for (const custom of settings.customProviders) {
			for (const modelId of custom.modelIds ?? []) {
				descriptors.push({
					id: toCompositeModelId(custom.id, modelId),
					label: `${modelId} · ${custom.name}`,
				});
			}
		}

		return descriptors;
	};

	/**
	 * Chat models the signed-in Copilot account may actually use, or `undefined`
	 * to fall back to the registry's list.
	 *
	 * Failure is deliberately silent: an entitlement lookup that cannot reach
	 * GitHub is not a reason to make a configured provider unusable, so a stale
	 * answer is preferred to none and no answer is preferred to an error.
	 */
	private liveCopilotModels = async (): Promise<CopilotModel[] | undefined> => {
		const cached = this.copilotModels;
		if (cached && Date.now() - cached.at < COPILOT_MODELS_TTL_MS) {
			return cached.models;
		}

		const settings = await readAgentSettings();
		const credential = settings.credentials[CopilotDeviceFlowAuth.providerId];
		if (!credential?.oauthToken) {
			return undefined;
		}

		try {
			// Deliberately not filtered to `supportsTools`. The agent does need
			// tool calling, but whether Copilot populates that capability for
			// every plan is unverified, and a filter that silently empties the
			// picker is a worse failure than a model that rejects a tool call
			// with an explicit error.
			const models = await fetchCopilotModels(credential.oauthToken, {
				enterpriseDomain: credential.enterpriseDomain,
			});
			this.copilotModels = {
				at: Date.now(),
				models,
			};
			return models;
		} catch {
			return cached?.models;
		}
	};

	getModel = async (providerId?: string): Promise<LanguageModel> => {
		const composite = providerId ?? (await this.selectedModel());
		if (!composite) {
			throw new Error(
				"No language model is configured. Open the extension settings to choose a provider and model.",
			);
		}
		const parsed = parseCompositeModelId(composite);
		if (!parsed) {
			throw new Error(
				`Malformed model id "${composite}" — expected "<provider>:<model>".`,
			);
		}

		const provider = await this.resolveProvider(parsed.providerId);
		if (!provider) {
			throw new Error(
				`Unknown provider "${parsed.providerId}". It may have been removed from the models.dev registry.`,
			);
		}

		await this.assertCopilotModelEntitled(provider.id, parsed.modelId);

		const auth = await this.authFor(provider.id).resolve(provider.id);
		const baseUrl = resolveBaseUrl(provider.id, provider.api, auth.baseUrl);

		return factoryFor(provider.npm)({
			providerId: provider.id,
			modelId: parsed.modelId,
			baseUrl,
			auth,
		});
	};

	/**
	 * Fail before the request when a Copilot model the account cannot use is
	 * selected.
	 *
	 * Copilot answers such a request with "The requested model is not
	 * supported", which names neither the model nor the fix. A selection can go
	 * stale simply by being persisted: it may predate this check, or the plan
	 * may have changed.
	 */
	private assertCopilotModelEntitled = async (
		providerId: string,
		modelId: string,
	): Promise<void> => {
		if (providerId !== CopilotDeviceFlowAuth.providerId) {
			return;
		}
		const entitled = await this.liveCopilotModels();
		// An empty list is "we learned nothing", not "nothing is allowed". Treating
		// the two alike produced the self-defeating "choose one of:" followed by
		// no models at all.
		if (!entitled?.length || entitled.some((model) => model.id === modelId)) {
			// Unknown entitlement is not grounds to block: the request may still
			// succeed, and Copilot's own error is better than a guess.
			return;
		}
		throw new Error(
			`Your GitHub Copilot plan does not include the model "${modelId}". ` +
				`Open settings and choose one of: ${entitled
					.map((model) => model.id)
					.join(", ")}.`,
		);
	};

	/** The persisted selection, or the first configured provider's newest model. */
	private async selectedModel(): Promise<string | undefined> {
		const settings = await readAgentSettings();
		if (settings.selectedModel) {
			return settings.selectedModel;
		}
		// First run after adding a key: the user has credentials but has not opened
		// the model picker yet. Models are sorted newest-first by the catalog.
		const [first] = await this.listProviders();
		return first?.id;
	}
}
