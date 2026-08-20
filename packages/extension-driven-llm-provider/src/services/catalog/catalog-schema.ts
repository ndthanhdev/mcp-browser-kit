import { z } from "zod";

/**
 * Schema for https://models.dev/api.json.
 *
 * This is an external contract nobody here controls, so the schema is
 * deliberately **lenient**: every field beyond `id`/`name`/`npm` is optional,
 * unknown keys are ignored, and a model that fails to parse is dropped rather
 * than failing the whole document. A models.dev change should cost us a few
 * models, never the entire picker.
 *
 * Field names are snake_case because that is the wire format; the pruned
 * {@link CatalogProvider} types below are camelCase.
 */

const rawLimitSchema = z.object({
	context: z.number().optional(),
	output: z.number().optional(),
});

const rawCostSchema = z.object({
	input: z.number().optional(),
	output: z.number().optional(),
	// biome-ignore lint/style/useNamingConvention: models.dev wire format.
	cache_read: z.number().optional(),
	// biome-ignore lint/style/useNamingConvention: models.dev wire format.
	cache_write: z.number().optional(),
});

const rawModelSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	// biome-ignore lint/style/useNamingConvention: models.dev wire format.
	tool_call: z.boolean().optional(),
	reasoning: z.boolean().optional(),
	attachment: z.boolean().optional(),
	// biome-ignore lint/style/useNamingConvention: models.dev wire format.
	release_date: z.string().optional(),
	limit: rawLimitSchema.optional(),
	cost: rawCostSchema.optional(),
});

const rawProviderSchema = z.object({
	id: z.string(),
	name: z.string(),
	npm: z.string(),
	/**
	 * Base URL. Present for every provider whose `npm` is
	 * `@ai-sdk/openai-compatible`; absent when the URL is baked into a dedicated
	 * SDK package.
	 */
	api: z.string().optional(),
	/** Env var names the provider's key is conventionally read from. */
	env: z.array(z.string()).optional(),
	doc: z.string().optional(),
	models: z.record(z.string(), z.unknown()).optional(),
});

/** The whole document: a map of provider id → provider. */
export const modelsDevDocumentSchema = z.record(z.string(), z.unknown());

// --- Pruned, camelCase shapes ---

/** Token limits, when models.dev knows them. */
export interface CatalogModelLimit {
	context?: number;
	output?: number;
}

/** USD per million tokens, when models.dev knows them. */
export interface CatalogModelCost {
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
}

/** One model, pruned to what the picker and the agent actually use. */
export interface CatalogModel {
	id: string;
	name: string;
	/** Always true — non-tool-calling models are dropped during pruning. */
	toolCall: true;
	reasoning: boolean;
	attachment: boolean;
	releaseDate?: string;
	limit?: CatalogModelLimit;
	cost?: CatalogModelCost;
}

/** One provider and its usable models. */
export interface CatalogProvider {
	id: string;
	name: string;
	/** npm package name, used to pick a model factory. */
	npm: string;
	api?: string;
	env: string[];
	doc?: string;
	models: CatalogModel[];
}

/** The pruned registry, keyed by provider id. */
export type Catalog = Record<string, CatalogProvider>;

/**
 * Parse and prune a raw models.dev document.
 *
 * Pruning does two jobs:
 *
 * - **Drops non-tool-calling models.** The agent is a tool loop, so a model
 *   without tool calling yields a session that talks but never touches the
 *   browser. Offering one is worse than hiding it.
 * - **Drops unused fields** (`description`, `knowledge`, `modalities`,
 *   `open_weights`, `structured_output`, …). Together these take the document
 *   from ~4.0 MB to ~1.25 MB, which is what makes it reasonable to hold in
 *   `storage.local`.
 *
 * Providers left with no usable models are dropped entirely.
 */
export const pruneCatalog = (raw: unknown): Catalog => {
	const document = modelsDevDocumentSchema.safeParse(raw);
	if (!document.success) {
		throw new Error("models.dev returned something that is not an object map.");
	}

	const catalog: Catalog = {};

	for (const value of Object.values(document.data)) {
		const provider = rawProviderSchema.safeParse(value);
		if (!provider.success) {
			// One malformed provider must not cost us the other 190.
			continue;
		}

		const models: CatalogModel[] = [];
		for (const rawModel of Object.values(provider.data.models ?? {})) {
			const model = rawModelSchema.safeParse(rawModel);
			if (!(model.success && model.data.tool_call)) {
				continue;
			}
			models.push({
				id: model.data.id,
				name: model.data.name ?? model.data.id,
				toolCall: true,
				reasoning: model.data.reasoning ?? false,
				attachment: model.data.attachment ?? false,
				releaseDate: model.data.release_date,
				limit: model.data.limit,
				cost: model.data.cost && {
					input: model.data.cost.input,
					output: model.data.cost.output,
					cacheRead: model.data.cost.cache_read,
					cacheWrite: model.data.cost.cache_write,
				},
			});
		}

		if (models.length === 0) {
			continue;
		}

		// Newest first — the picker's default order. models.dev's own order is
		// insertion order and not meaningful.
		models.sort((a, b) =>
			(b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
		);

		catalog[provider.data.id] = {
			id: provider.data.id,
			name: provider.data.name,
			npm: provider.data.npm,
			api: provider.data.api,
			env: provider.data.env ?? [],
			doc: provider.data.doc,
			models,
		};
	}

	return catalog;
};
