import browser from "webextension-polyfill";
import type { Catalog } from "./catalog-schema";

/** `storage.local` key holding the pruned catalog. */
export const CATALOG_STORAGE_KEY = "mbk.catalog.v1";
/** `storage.local` key holding the ETag and fetch timestamp. */
export const CATALOG_META_STORAGE_KEY = "mbk.catalog.meta";

/**
 * Bumped when {@link Catalog}'s shape changes. A mismatch discards the cache
 * rather than handing stale-shaped data to code expecting the new shape — the
 * cost is one refetch, which beats a migration for derived data.
 */
export const CATALOG_SCHEMA_VERSION = 1;

/** Refetch after this long. models.dev changes daily-ish as models ship. */
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface CatalogMeta {
	schemaVersion: number;
	/** ETag from the last successful fetch, for conditional revalidation. */
	etag?: string;
	/** Epoch ms of the last successful fetch or revalidation. */
	fetchedAt: number;
}

/** What {@link CatalogCache.read} found. */
export interface CachedCatalog {
	catalog: Catalog;
	meta: CatalogMeta;
}

/**
 * Persists the pruned catalog in `storage.local`.
 *
 * Two contexts read it — the sidepanel's model picker and the background's
 * model factory — and `storage.local` is the only thing they share. The pruned
 * document is ~1.25 MB against a 10 MB quota, so no `unlimitedStorage`
 * permission is needed (which would add an install-time warning for no gain).
 */
export class CatalogCache {
	read = async (): Promise<CachedCatalog | undefined> => {
		const record = await browser.storage.local.get([
			CATALOG_STORAGE_KEY,
			CATALOG_META_STORAGE_KEY,
		]);
		const catalog = record[CATALOG_STORAGE_KEY] as Catalog | undefined;
		const meta = record[CATALOG_META_STORAGE_KEY] as CatalogMeta | undefined;

		if (!(catalog && meta) || typeof catalog !== "object") {
			return undefined;
		}
		if (meta.schemaVersion !== CATALOG_SCHEMA_VERSION) {
			return undefined;
		}
		return {
			catalog,
			meta,
		};
	};

	write = async (
		catalog: Catalog,
		etag: string | undefined,
		now: number = Date.now(),
	): Promise<void> => {
		await browser.storage.local.set({
			[CATALOG_STORAGE_KEY]: catalog,
			[CATALOG_META_STORAGE_KEY]: {
				schemaVersion: CATALOG_SCHEMA_VERSION,
				etag,
				fetchedAt: now,
			} satisfies CatalogMeta,
		});
	};

	/**
	 * Replace the metadata without rewriting the ~1.25 MB catalog body. Used
	 * after a 304, and by tests that need a cache of a specific age.
	 */
	writeMeta = async (meta: CatalogMeta): Promise<void> => {
		await browser.storage.local.set({
			[CATALOG_META_STORAGE_KEY]: meta,
		});
	};

	/** Record that a revalidation confirmed the cache is still current. */
	touch = async (
		meta: CatalogMeta,
		now: number = Date.now(),
	): Promise<void> => {
		await this.writeMeta({
			...meta,
			fetchedAt: now,
		});
	};

	clear = async (): Promise<void> => {
		await browser.storage.local.remove([
			CATALOG_STORAGE_KEY,
			CATALOG_META_STORAGE_KEY,
		]);
	};
}

/** Whether a cached catalog is old enough to warrant revalidation. */
export const isStale = (
	meta: CatalogMeta,
	now: number = Date.now(),
	maxAgeMs: number = CATALOG_MAX_AGE_MS,
): boolean => now - meta.fetchedAt > maxAgeMs;
