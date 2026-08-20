import { CatalogCache, isStale } from "./catalog-cache";
import type { Catalog, CatalogModel, CatalogProvider } from "./catalog-schema";
import { ModelsDevClient } from "./models-dev-client";

/** A model together with the provider that serves it. */
export interface CatalogEntry {
	provider: CatalogProvider;
	model: CatalogModel;
}

/** What the UI needs to render honestly while the first fetch is in flight. */
export type CatalogState =
	| {
			status: "empty";
	  }
	| {
			status: "loading";
	  }
	| {
			status: "ready";
			catalog: Catalog;
			fetchedAt: number;
	  }
	| {
			status: "error";
			message: string;
			/** A previously cached catalog, if there is one to fall back on. */
			catalog?: Catalog;
	  };

/**
 * The models.dev registry, cached.
 *
 * Provider and model metadata is *data*, not code: adding a provider is an
 * upstream registry entry, not a release here. That is the whole point of this
 * class.
 *
 * Failure policy is deliberate — **a bad fetch never destroys a good cache**.
 * models.dev is an external contract we don't control, so a schema change or an
 * outage degrades the picker to "stale but working" rather than "empty".
 */
export class ModelCatalog {
	private inFlight?: Promise<Catalog>;
	private memo?: Catalog;

	constructor(
		private readonly client: ModelsDevClient = new ModelsDevClient(),
		private readonly cache: CatalogCache = new CatalogCache(),
		/** Injected so staleness is testable without mocking global time. */
		private readonly now: () => number = Date.now,
	) {}

	/**
	 * The catalog, fetching only if there is nothing cached.
	 *
	 * Single-flight: the sidepanel opening while the background is already
	 * fetching must not start a second 4 MB download.
	 */
	get = async (): Promise<Catalog> => {
		if (this.memo) {
			return this.memo;
		}
		this.inFlight ??= this.load().finally(() => {
			this.inFlight = undefined;
		});
		return this.inFlight;
	};

	/** The cached catalog without touching the network — `undefined` if none. */
	peek = async (): Promise<Catalog | undefined> => {
		if (this.memo) {
			return this.memo;
		}
		const cached = await this.cache.read();
		this.memo = cached?.catalog;
		return this.memo;
	};

	/**
	 * Refresh if the cache is missing or stale. Returns the catalog in use
	 * afterwards, which on failure is the previously cached one.
	 */
	refreshIfStale = async (): Promise<Catalog | undefined> => {
		const cached = await this.cache.read();
		if (cached && !isStale(cached.meta, this.now())) {
			this.memo = cached.catalog;
			return cached.catalog;
		}
		try {
			return await this.get();
		} catch {
			this.memo = cached?.catalog;
			return this.memo;
		}
	};

	/** Force a refetch, ignoring staleness. Used by the settings page's retry. */
	forceRefresh = async (): Promise<Catalog> => {
		this.memo = undefined;
		const cached = await this.cache.read();
		const result = await this.client.fetchCatalog(cached?.meta.etag);
		if (result.status === "not-modified") {
			if (cached) {
				await this.cache.touch(cached.meta, this.now());
				this.memo = cached.catalog;
				return cached.catalog;
			}
			// 304 with nothing cached: our ETag was stale bookkeeping. Ask again
			// unconditionally rather than returning nothing.
			const retry = await this.client.fetchCatalog();
			if (retry.status === "not-modified") {
				throw new Error("models.dev reported not-modified with no cache.");
			}
			await this.cache.write(retry.catalog, retry.etag, this.now());
			this.memo = retry.catalog;
			return retry.catalog;
		}
		await this.cache.write(result.catalog, result.etag, this.now());
		this.memo = result.catalog;
		return result.catalog;
	};

	private async load(): Promise<Catalog> {
		const cached = await this.cache.read();
		if (cached && !isStale(cached.meta, this.now())) {
			this.memo = cached.catalog;
			return cached.catalog;
		}

		try {
			const result = await this.client.fetchCatalog(cached?.meta.etag);
			if (result.status === "not-modified" && cached) {
				await this.cache.touch(cached.meta, this.now());
				this.memo = cached.catalog;
				return cached.catalog;
			}
			if (result.status === "fresh") {
				await this.cache.write(result.catalog, result.etag, this.now());
				this.memo = result.catalog;
				return result.catalog;
			}
			throw new Error("models.dev reported not-modified with no cache.");
		} catch (error) {
			// Stale data beats no data: an offline user with a week-old catalog can
			// still pick the model they were already using.
			if (cached) {
				this.memo = cached.catalog;
				return cached.catalog;
			}
			throw error;
		}
	}

	// --- Queries ---

	/** Look up one provider. */
	getProvider = async (
		providerId: string,
	): Promise<CatalogProvider | undefined> => (await this.get())[providerId];

	/** Look up one model within a provider. */
	getEntry = async (
		providerId: string,
		modelId: string,
	): Promise<CatalogEntry | undefined> => {
		const provider = (await this.get())[providerId];
		const model = provider?.models.find(
			(candidate) => candidate.id === modelId,
		);
		return provider && model
			? {
					provider,
					model,
				}
			: undefined;
	};

	/** Every provider, ordered by name for a picker. */
	listProviders = async (): Promise<CatalogProvider[]> =>
		Object.values(await this.get()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
}

/**
 * Case-insensitive substring search over provider and model names.
 *
 * ~190 providers and ~5,800 models is far too many for a plain dropdown, so the
 * settings picker is search-first. Kept pure and outside the class so it can be
 * tested without storage or network.
 */
export const searchCatalog = (
	catalog: Catalog,
	query: string,
	limit = 50,
): CatalogEntry[] => {
	const needle = query.trim().toLowerCase();
	const results: CatalogEntry[] = [];

	for (const provider of Object.values(catalog)) {
		const providerMatches =
			provider.name.toLowerCase().includes(needle) ||
			provider.id.toLowerCase().includes(needle);

		for (const model of provider.models) {
			if (
				needle &&
				!(
					providerMatches ||
					model.name.toLowerCase().includes(needle) ||
					model.id.toLowerCase().includes(needle)
				)
			) {
				continue;
			}
			results.push({
				provider,
				model,
			});
			if (results.length >= limit) {
				return results;
			}
		}
	}

	return results;
};
