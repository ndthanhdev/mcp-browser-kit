import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBrowserStub } from "../testing/webextension-polyfill-stub";
import {
	updateProviderCredential,
	upsertCustomProvider,
	writeSelectedModel,
} from "./agent-settings-storage";
import { CatalogCache } from "./catalog/catalog-cache";
import type { Catalog } from "./catalog/catalog-schema";
import { ModelCatalog } from "./catalog/model-catalog";
import { DrivenLlmProvider } from "./driven-llm-provider";
import * as factories from "./factories/provider-factories";

const catalogOf = (
	providers: Array<{
		id: string;
		npm?: string;
		/** `null` means models.dev omits `api` — the URL lives in the SDK package. */
		api?: string | null;
		models: string[];
	}>,
): Catalog =>
	Object.fromEntries(
		providers.map((provider) => [
			provider.id,
			{
				id: provider.id,
				name: provider.id.toUpperCase(),
				npm: provider.npm ?? "@ai-sdk/openai-compatible",
				api:
					provider.api === null
						? undefined
						: (provider.api ?? `https://${provider.id}.test/v1`),
				env: [],
				models: provider.models.map((id) => ({
					id,
					name: id.toUpperCase(),
					toolCall: true as const,
					reasoning: false,
					attachment: false,
				})),
			},
		]),
	);

/** A catalog already populated in storage, so nothing hits the network. */
const seededCatalog = async (catalog: Catalog) => {
	const cache = new CatalogCache();
	await cache.write(catalog, "v1");
	return new ModelCatalog(undefined, cache);
};

beforeEach(() => {
	resetBrowserStub();
	vi.restoreAllMocks();
});

describe("listProviders", () => {
	it("lists models only from providers that have credentials", async () => {
		const catalog = await seededCatalog(
			catalogOf([
				{
					id: "groq",
					models: [
						"llama",
					],
				},
				{
					id: "mistral",
					models: [
						"large",
					],
				},
			]),
		);
		await updateProviderCredential("groq", () => ({
			apiKey: "k",
		}));

		const registry = new DrivenLlmProvider(catalog);

		// Listing ~5,800 models the user cannot call would make the port useless.
		expect(await registry.listProviders()).toEqual([
			{
				id: "groq:llama",
				label: "LLAMA · GROQ",
			},
		]);
	});

	it("qualifies model ids with their provider", async () => {
		const catalog = await seededCatalog(
			catalogOf([
				{
					id: "a",
					models: [
						"gpt-4o",
					],
				},
				{
					id: "b",
					models: [
						"gpt-4o",
					],
				},
			]),
		);
		await updateProviderCredential("a", () => ({
			apiKey: "k",
		}));
		await updateProviderCredential("b", () => ({
			apiKey: "k",
		}));

		const ids = (await new DrivenLlmProvider(catalog).listProviders()).map(
			(descriptor) => descriptor.id,
		);
		// Model ids are only unique within a provider.
		expect(ids.sort()).toEqual([
			"a:gpt-4o",
			"b:gpt-4o",
		]);
	});

	it("includes custom providers' recorded models", async () => {
		const catalog = await seededCatalog(catalogOf([]));
		await upsertCustomProvider({
			id: "ollama",
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
			modelIds: [
				"qwen3-coder",
			],
		});

		expect(await new DrivenLlmProvider(catalog).listProviders()).toEqual([
			{
				id: "ollama:qwen3-coder",
				label: "qwen3-coder · Ollama",
			},
		]);
	});

	it("skips a configured provider the registry no longer lists", async () => {
		const catalog = await seededCatalog(catalogOf([]));
		await updateProviderCredential("since-removed", () => ({
			apiKey: "k",
		}));

		expect(await new DrivenLlmProvider(catalog).listProviders()).toEqual([]);
	});
});

describe("getModel", () => {
	const setup = async () => {
		const catalog = await seededCatalog(
			catalogOf([
				{
					id: "groq",
					models: [
						"llama",
					],
				},
				{
					id: "anthropic",
					npm: "@ai-sdk/anthropic",
					api: null,
					models: [
						"claude",
					],
				},
			]),
		);
		await updateProviderCredential("groq", () => ({
			apiKey: "gk",
		}));
		await updateProviderCredential("anthropic", () => ({
			apiKey: "ak",
		}));
		return new DrivenLlmProvider(catalog);
	};

	it("routes to the factory named by the registry's npm field", async () => {
		const spy = vi
			.spyOn(factories, "factoryFor")
			.mockReturnValue(async () => "model" as never);

		await (await setup()).getModel("anthropic:claude");

		expect(spy).toHaveBeenCalledWith("@ai-sdk/anthropic");
	});

	it("passes the registry base URL and the resolved key to the factory", async () => {
		const factory = vi.fn(async () => "model" as never);
		vi.spyOn(factories, "factoryFor").mockReturnValue(factory);

		await (await setup()).getModel("groq:llama");

		expect(factory).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: "groq",
				modelId: "llama",
				baseUrl: "https://groq.test/v1",
				auth: expect.objectContaining({
					apiKey: "gk",
				}),
			}),
		);
	});

	it("falls back to a static base URL when the registry omits one", async () => {
		const factory = vi.fn(async () => "model" as never);
		vi.spyOn(factories, "factoryFor").mockReturnValue(factory);

		await (await setup()).getModel("anthropic:claude");

		expect(factory).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: "https://api.anthropic.com/v1",
			}),
		);
	});

	it("uses the persisted selection when given no argument", async () => {
		const factory = vi.fn(async () => "model" as never);
		vi.spyOn(factories, "factoryFor").mockReturnValue(factory);
		const registry = await setup();
		await writeSelectedModel("anthropic:claude");

		await registry.getModel();

		expect(factory).toHaveBeenCalledWith(
			expect.objectContaining({
				modelId: "claude",
			}),
		);
	});

	it("falls back to the first configured model when nothing is selected", async () => {
		const factory = vi.fn(async () => "model" as never);
		vi.spyOn(factories, "factoryFor").mockReturnValue(factory);

		await (await setup()).getModel();

		expect(factory).toHaveBeenCalledOnce();
	});

	it("explains itself when nothing is configured", async () => {
		const catalog = await seededCatalog(catalogOf([]));

		await expect(new DrivenLlmProvider(catalog).getModel()).rejects.toThrow(
			/No language model is configured/,
		);
	});

	it("rejects a malformed composite id", async () => {
		await expect((await setup()).getModel("llama")).rejects.toThrow(
			/expected "<provider>:<model>"/,
		);
	});

	it("names the provider when it is no longer in the registry", async () => {
		await expect((await setup()).getModel("bedrock:claude")).rejects.toThrow(
			/Unknown provider "bedrock"/,
		);
	});

	it("requires a key before building a model", async () => {
		const catalog = await seededCatalog(
			catalogOf([
				{
					id: "groq",
					models: [
						"llama",
					],
				},
			]),
		);

		await expect(
			new DrivenLlmProvider(catalog).getModel("groq:llama"),
		).rejects.toThrow(/No API key stored for "groq"/);
	});
});

describe("provider resolution", () => {
	it("prefers a custom provider over a registry entry of the same id", async () => {
		const catalog = await seededCatalog(
			catalogOf([
				{
					id: "groq",
					models: [
						"llama",
					],
				},
			]),
		);
		await upsertCustomProvider({
			id: "groq",
			name: "My Groq proxy",
			baseUrl: "http://localhost:9000/v1",
		});

		// The user's own definition is the more specific intent.
		expect(
			await new DrivenLlmProvider(catalog).resolveProvider("groq"),
		).toMatchObject({
			name: "My Groq proxy",
			api: "http://localhost:9000/v1",
			custom: true,
		});
	});

	it("selects the Copilot device flow for that provider only", async () => {
		const registry = new DrivenLlmProvider(await seededCatalog(catalogOf([])));

		expect(registry.authFor("github-copilot")).toBe(registry.copilot);
		expect(registry.authFor("groq")).not.toBe(registry.copilot);
	});
});
