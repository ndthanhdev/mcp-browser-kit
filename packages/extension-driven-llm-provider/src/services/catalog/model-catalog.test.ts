import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBrowserStub } from "../../testing/webextension-polyfill-stub";
import { CATALOG_MAX_AGE_MS, CatalogCache } from "./catalog-cache";
import type { Catalog } from "./catalog-schema";
import { ModelCatalog, searchCatalog } from "./model-catalog";
import { ModelsDevClient } from "./models-dev-client";

const catalogOf = (providerId: string, modelIds: string[]): Catalog => ({
	[providerId]: {
		id: providerId,
		name: providerId.toUpperCase(),
		npm: "@ai-sdk/openai-compatible",
		api: "https://example.test/v1",
		env: [],
		models: modelIds.map((id) => ({
			id,
			name: id.toUpperCase(),
			toolCall: true,
			reasoning: false,
			attachment: false,
		})),
	},
});

/** A models.dev response body for the given providers. */
const wireDocument = (providerId: string, modelIds: string[]) => ({
	[providerId]: {
		id: providerId,
		name: providerId.toUpperCase(),
		npm: "@ai-sdk/openai-compatible",
		api: "https://example.test/v1",
		models: Object.fromEntries(
			modelIds.map((id) => [
				id,
				{
					id,
					name: id.toUpperCase(),
					// biome-ignore lint/style/useNamingConvention: models.dev wire format.
					tool_call: true,
				},
			]),
		),
	},
});

const jsonResponse = (
	body: unknown,
	init: {
		status?: number;
		etag?: string;
	} = {},
) =>
	new Response(init.status === 304 ? null : JSON.stringify(body), {
		status: init.status ?? 200,
		headers: init.etag
			? {
					etag: init.etag,
				}
			: {},
	});

const clientReturning = (fetchImpl: ReturnType<typeof vi.fn>) =>
	new ModelsDevClient(fetchImpl as unknown as typeof fetch);

/** A fixed clock, so staleness is exercised without mocking global time. */
const NOW = 1_000_000_000_000;
const at = (ms: number) => () => ms;

/** Seed the cache with a catalog of a chosen age. */
const seedCache = async (age: number) => {
	const cache = new CatalogCache();
	await cache.write(
		catalogOf("acme", [
			"m1",
		]),
		"v1",
		NOW - age,
	);
	await cache.writeMeta({
		schemaVersion: 1,
		etag: "v1",
		fetchedAt: NOW - age,
	});
	return cache;
};

beforeEach(() => {
	resetBrowserStub();
});

describe("first load", () => {
	it("fetches, prunes and caches", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse(
				wireDocument("acme", [
					"m1",
				]),
				{
					etag: "v1",
				},
			),
		);
		const catalog = new ModelCatalog(
			clientReturning(fetchImpl),
			new CatalogCache(),
		);

		const result = await catalog.get();

		expect(Object.keys(result)).toEqual([
			"acme",
		]);
		// A second reader must not trigger a second 4 MB download.
		await catalog.get();
		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it("collapses concurrent first loads into one request", async () => {
		let release: (value: Response) => void = () => {};
		const pending = new Promise<Response>((resolve) => {
			release = resolve;
		});
		const fetchImpl = vi.fn(() => pending);
		const catalog = new ModelCatalog(
			clientReturning(fetchImpl),
			new CatalogCache(),
		);

		const all = Promise.all([
			catalog.get(),
			catalog.get(),
			catalog.get(),
		]);
		release(
			jsonResponse(
				wireDocument("acme", [
					"m1",
				]),
			),
		);
		await all;

		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it("propagates the failure when there is nothing to fall back on", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse(
				{},
				{
					status: 503,
				},
			),
		);
		const catalog = new ModelCatalog(
			clientReturning(fetchImpl),
			new CatalogCache(),
		);

		await expect(catalog.get()).rejects.toThrow(/HTTP 503/);
	});
});

describe("caching and revalidation", () => {
	it("serves a fresh cache without touching the network", async () => {
		const cache = await seedCache(0);
		const fetchImpl = vi.fn();

		await new ModelCatalog(clientReturning(fetchImpl), cache, at(NOW)).get();

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("sends the stored ETag when revalidating a stale cache", async () => {
		const cache = await seedCache(CATALOG_MAX_AGE_MS * 2);
		// Capture the request rather than reading `mock.calls`: the mock's own
		// signature takes no arguments, so its `calls` tuple is typed empty.
		let sent: RequestInit | undefined;
		const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
			sent = init;
			return jsonResponse(null, {
				status: 304,
			});
		});

		const result = await new ModelCatalog(
			clientReturning(fetchImpl),
			cache,
			at(NOW),
		).get();

		expect(fetchImpl).toHaveBeenCalledOnce();
		const headers = (sent?.headers ?? {}) as Record<string, string>;
		expect(headers["if-none-match"]).toBe("v1");
		// A 304 keeps the cached copy rather than emptying it.
		expect(Object.keys(result)).toEqual([
			"acme",
		]);
	});

	it("records the revalidation so the next read is served from cache", async () => {
		const cache = await seedCache(CATALOG_MAX_AGE_MS * 2);
		const fetchImpl = vi.fn(async () =>
			jsonResponse(null, {
				status: 304,
			}),
		);

		await new ModelCatalog(clientReturning(fetchImpl), cache, at(NOW)).get();

		const cached = await cache.read();
		expect(cached?.meta.fetchedAt).toBe(NOW);
	});

	it("discards a cache written under an older schema version", async () => {
		const cache = await seedCache(0);
		await cache.writeMeta({
			schemaVersion: 0,
			etag: "v1",
			fetchedAt: NOW,
		});

		expect(await cache.read()).toBeUndefined();
	});
});

describe("a bad fetch never destroys a good cache", () => {
	it("falls back to the cached catalog when the network fails", async () => {
		const cache = await seedCache(CATALOG_MAX_AGE_MS * 2);
		const fetchImpl = vi.fn(async () => {
			throw new Error("offline");
		});
		const catalog = new ModelCatalog(
			clientReturning(fetchImpl),
			cache,
			at(NOW),
		);

		expect(Object.keys(await catalog.get())).toEqual([
			"acme",
		]);
		// And the cache is still intact for next time.
		expect(await cache.read()).toBeDefined();
	});

	it("treats a structurally valid but empty document as a failure", async () => {
		// The likely shape of a models.dev restructure: parses fine, yields nothing.
		const cache = await seedCache(CATALOG_MAX_AGE_MS * 2);
		const fetchImpl = vi.fn(async () => jsonResponse({}));
		const catalog = new ModelCatalog(
			clientReturning(fetchImpl),
			cache,
			at(NOW),
		);

		expect(Object.keys(await catalog.get())).toEqual([
			"acme",
		]);
		const cached = await cache.read();
		expect(Object.keys(cached?.catalog ?? {})).toEqual([
			"acme",
		]);
	});
});

describe("queries", () => {
	const catalog = () =>
		new ModelCatalog(
			clientReturning(
				vi.fn(async () =>
					jsonResponse(
						wireDocument("acme", [
							"m1",
							"m2",
						]),
					),
				),
			),
			new CatalogCache(),
		);

	it("resolves a provider and model pair", async () => {
		expect(await catalog().getEntry("acme", "m2")).toMatchObject({
			provider: {
				id: "acme",
			},
			model: {
				id: "m2",
			},
		});
	});

	it("returns undefined for an unknown model", async () => {
		expect(await catalog().getEntry("acme", "nope")).toBeUndefined();
		expect(await catalog().getEntry("nope", "m1")).toBeUndefined();
	});

	it("peek does not hit the network", async () => {
		const fetchImpl = vi.fn();
		const model = new ModelCatalog(
			clientReturning(fetchImpl),
			new CatalogCache(),
		);

		expect(await model.peek()).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});

describe("searchCatalog", () => {
	const catalog: Catalog = {
		...catalogOf("anthropic", [
			"claude-opus-4",
			"claude-haiku-4",
		]),
		...catalogOf("groq", [
			"llama-3-70b",
		]),
	};

	it("returns everything for an empty query", () => {
		expect(searchCatalog(catalog, "")).toHaveLength(3);
	});

	it("matches on provider name and yields all its models", () => {
		const results = searchCatalog(catalog, "anthropic");
		expect(results).toHaveLength(2);
	});

	it("matches on model id", () => {
		const results = searchCatalog(catalog, "haiku");
		expect(results.map((entry) => entry.model.id)).toEqual([
			"claude-haiku-4",
		]);
	});

	it("is case insensitive", () => {
		expect(searchCatalog(catalog, "LLAMA")).toHaveLength(1);
	});

	it("caps results so the picker stays responsive over ~5,800 models", () => {
		expect(searchCatalog(catalog, "", 2)).toHaveLength(2);
	});

	it("returns nothing for a non-match", () => {
		expect(searchCatalog(catalog, "zzzz")).toEqual([]);
	});
});
