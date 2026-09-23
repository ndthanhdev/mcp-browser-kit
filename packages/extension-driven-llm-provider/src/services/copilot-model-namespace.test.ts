import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBrowserStub } from "../testing/webextension-polyfill-stub";
import { updateProviderCredential } from "./agent-settings-storage";
import { CatalogCache } from "./catalog/catalog-cache";
import type { Catalog } from "./catalog/catalog-schema";
import { ModelCatalog } from "./catalog/model-catalog";
import { DrivenLlmProvider } from "./driven-llm-provider";
import * as factories from "./factories/provider-factories";

/**
 * models.dev advertises the current Copilot line-up; an account is served a
 * different set entirely. These lists are drawn from the real ones and share no
 * id, which is the entire point — the registry list is not a stale version of
 * the account's, it is a different namespace.
 */
const REGISTRY_MODEL_IDS = [
	"gpt-5.4",
	"claude-opus-5",
];
const ENTITLED_MODEL_IDS = [
	"gpt-4o-2024-11-20",
	"gpt-3.5-turbo",
];

const copilotCatalog = (modelIds: string[]): Catalog => ({
	"github-copilot": {
		id: "github-copilot",
		name: "GitHub Copilot",
		npm: "@ai-sdk/openai-compatible",
		api: "https://api.githubcopilot.com",
		env: [],
		models: modelIds.map((id) => ({
			id,
			name: id.toUpperCase(),
			toolCall: true as const,
			reasoning: false,
			attachment: false,
		})),
	},
});

/** A signed-in Copilot account whose `/models` call behaves as given. */
const setup = async (options: {
	registryModels: string[];
	respond: () => Response;
}) => {
	const cache = new CatalogCache();
	await cache.write(copilotCatalog(options.registryModels), "v1");
	await updateProviderCredential("github-copilot", () => ({
		oauthToken: "ghu_x",
	}));
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => options.respond()),
	);
	return new DrivenLlmProvider(new ModelCatalog(undefined, cache));
};

const entitled = (ids: string[]) => () =>
	Response.json({
		data: ids.map((id) => ({
			id,
			name: id,
			capabilities: {
				type: "chat",
			},
		})),
	});

const unreachable = () => () =>
	new Response("nope", {
		status: 500,
	});

beforeEach(() => {
	resetBrowserStub();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("Copilot models come from the account, never the registry", () => {
	it("offers the account's models, not models.dev's", async () => {
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: entitled(ENTITLED_MODEL_IDS),
		});

		const ids = (await provider.listProviders()).map(
			(descriptor) => descriptor.id,
		);

		expect(ids).toEqual([
			"github-copilot:gpt-4o-2024-11-20",
			"github-copilot:gpt-3.5-turbo",
		]);
	});

	it("offers nothing when the account's list cannot be fetched", async () => {
		// The regression. Falling back to the registry is what produced "The
		// requested model is not supported" — every registry id is guaranteed to
		// be rejected, so offering them is worse than offering none.
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: unreachable(),
		});

		await expect(provider.listProviders()).resolves.toEqual([]);
	});

	it("keeps models that omit the tool-calling capability", async () => {
		// An empty picker is a worse failure than a model that rejects a tool
		// call with an explicit error, and whether Copilot populates that
		// capability on every plan is unverified.
		const provider = await setup({
			registryModels: [],
			respond: entitled(ENTITLED_MODEL_IDS),
		});

		await expect(provider.listProviders()).resolves.toHaveLength(2);
	});
});

describe("selecting a Copilot model the account does not have", () => {
	it("names the model and the alternatives", async () => {
		vi.spyOn(factories, "factoryFor").mockReturnValue(
			async () => "model" as never,
		);
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: entitled(ENTITLED_MODEL_IDS),
		});

		// Copilot's own answer is "The requested model is not supported", which
		// names neither the model nor what to do about it.
		await expect(provider.getModel("github-copilot:gpt-5.4")).rejects.toThrow(
			/does not include the model "gpt-5\.4".*gpt-4o-2024-11-20, gpt-3\.5-turbo/s,
		);
	});

	it("allows a model the account does have", async () => {
		vi.spyOn(factories, "factoryFor").mockReturnValue(
			async () => "model" as never,
		);
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: entitled(ENTITLED_MODEL_IDS),
		});

		await expect(
			provider.getModel("github-copilot:gpt-4o-2024-11-20"),
		).resolves.toBeDefined();
	});

	it("does not block when the account returns no models at all", async () => {
		// An empty list means "we learned nothing", not "nothing is allowed".
		// Conflating the two produced a self-defeating error: "choose one of:"
		// followed by no models.
		vi.spyOn(factories, "factoryFor").mockReturnValue(
			async () => "model" as never,
		);
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: entitled([]),
		});

		await expect(
			provider.getModel("github-copilot:gpt-5.6-sol"),
		).resolves.toBeDefined();
	});

	it("does not block when entitlement is unknown", async () => {
		// A failed lookup should not make a working selection unusable; Copilot's
		// own error beats a guess.
		vi.spyOn(factories, "factoryFor").mockReturnValue(
			async () => "model" as never,
		);
		const provider = await setup({
			registryModels: REGISTRY_MODEL_IDS,
			respond: unreachable(),
		});

		await expect(
			provider.getModel("github-copilot:gpt-5.4"),
		).resolves.toBeDefined();
	});
});
