import { type Catalog, pruneCatalog } from "./catalog-schema";

/** The registry OpenCode also reads. */
export const MODELS_DEV_URL = "https://models.dev/api.json";

/** Outcome of a fetch attempt. */
export type CatalogFetchResult =
	| {
			status: "fresh";
			catalog: Catalog;
			etag?: string;
	  }
	/** The server confirmed our cached copy is still current (HTTP 304). */
	| {
			status: "not-modified";
	  };

/**
 * Fetches and prunes the models.dev registry.
 *
 * The document is ~4 MB, so this is not something to do casually — hence the
 * conditional request. models.dev serves a strong `ETag` and
 * `access-control-allow-origin: *`, so a revalidation costs one round trip and
 * no body when nothing has changed.
 */
export class ModelsDevClient {
	constructor(
		private readonly fetchImpl: typeof fetch = fetch,
		private readonly url: string = MODELS_DEV_URL,
	) {}

	/**
	 * @param etag the ETag from the last successful fetch, if any. Supplying it
	 *   turns this into a conditional request that usually returns 304.
	 */
	fetchCatalog = async (
		etag?: string,
		signal?: AbortSignal,
	): Promise<CatalogFetchResult> => {
		const response = await this.fetchImpl(this.url, {
			signal,
			headers: etag
				? {
						"if-none-match": etag,
					}
				: {},
		});

		if (response.status === 304) {
			return {
				status: "not-modified",
			};
		}
		if (!response.ok) {
			throw new Error(`models.dev returned HTTP ${response.status}.`);
		}

		const catalog = pruneCatalog(await response.json());
		if (Object.keys(catalog).length === 0) {
			// A structurally valid but empty result almost certainly means the
			// document's shape changed. Treat it as a failure so the caller keeps
			// its existing cache instead of replacing it with nothing.
			throw new Error(
				"models.dev returned no usable providers — its schema may have changed.",
			);
		}

		return {
			status: "fresh",
			catalog,
			etag: response.headers.get("etag") ?? undefined,
		};
	};
}
