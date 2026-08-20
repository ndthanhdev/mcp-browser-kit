import { beforeEach, describe, expect, it } from "vitest";
import {
	readBrowserStubStore,
	resetBrowserStub,
} from "../testing/webextension-polyfill-stub";
import {
	AGENT_SETTINGS_STORAGE_KEY,
	clearProviderCredential,
	parseCompositeModelId,
	readAgentSettings,
	removeCustomProvider,
	toCompositeModelId,
	updateProviderCredential,
	upsertCustomProvider,
	writeSelectedModel,
} from "./agent-settings-storage";

beforeEach(() => {
	resetBrowserStub();
});

describe("composite model ids", () => {
	it("splits on the first colon so variant slugs survive", () => {
		expect(parseCompositeModelId("openrouter:openai/gpt-4o:extended")).toEqual({
			providerId: "openrouter",
			modelId: "openai/gpt-4o:extended",
		});
	});

	it("rejects ids with no provider or no model", () => {
		expect(parseCompositeModelId("gpt-4o")).toBeUndefined();
		expect(parseCompositeModelId(":gpt-4o")).toBeUndefined();
		expect(parseCompositeModelId("copilot:")).toBeUndefined();
	});

	it("round-trips", () => {
		expect(
			parseCompositeModelId(toCompositeModelId("github-copilot", "gpt-4o")),
		).toEqual({
			providerId: "github-copilot",
			modelId: "gpt-4o",
		});
	});
});

describe("migration from the single-key shape (v1)", () => {
	it("moves openRouterApiKey into the id-keyed credentials record", async () => {
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: {
				openRouterApiKey: "sk-legacy",
				modelId: "anthropic/claude-3.7-sonnet",
			},
		});

		expect(await readAgentSettings()).toEqual({
			credentials: {
				openrouter: {
					apiKey: "sk-legacy",
				},
			},
			selectedModel: "openrouter:anthropic/claude-3.7-sonnet",
			customProviders: [],
		});
	});

	it("does not invent a credential when the legacy key was unset", async () => {
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: {},
		});

		expect((await readAgentSettings()).credentials).toEqual({});
	});
});

describe("migration from the fixed-slice shape (v2)", () => {
	it("re-keys copilot to the id models.dev uses", async () => {
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: {
				credentials: {
					copilot: {
						oauthToken: "gho_x",
						login: "octocat",
					},
				},
				selectedModel: "copilot:gpt-4o",
			},
		});

		// The registry calls it `github-copilot`; without re-keying, lookups miss
		// and the user appears signed out.
		expect(await readAgentSettings()).toEqual({
			credentials: {
				"github-copilot": {
					oauthToken: "gho_x",
					account: "octocat",
				},
			},
			selectedModel: "github-copilot:gpt-4o",
			customProviders: [],
		});
	});

	it("carries an openrouter key across unchanged", async () => {
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: {
				credentials: {
					openrouter: {
						apiKey: "sk-a",
					},
				},
				selectedModel: "openrouter:openai/gpt-4o",
			},
		});

		expect(await readAgentSettings()).toMatchObject({
			credentials: {
				openrouter: {
					apiKey: "sk-a",
				},
			},
			selectedModel: "openrouter:openai/gpt-4o",
		});
	});

	it("leaves already-current settings alone", async () => {
		const current = {
			credentials: {
				groq: {
					apiKey: "k",
				},
			},
			selectedModel: "groq:llama",
			customProviders: [],
		};
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: current,
		});

		expect(await readAgentSettings()).toEqual(current);
	});

	it("returns empty settings when nothing is persisted", async () => {
		expect(await readAgentSettings()).toEqual({
			credentials: {},
			customProviders: [],
		});
	});
});

describe("partial writes", () => {
	it("updates one provider without clobbering the others", async () => {
		await updateProviderCredential("groq", () => ({
			apiKey: "gk",
		}));
		await writeSelectedModel("groq:llama");
		await updateProviderCredential("github-copilot", () => ({
			oauthToken: "gho_b",
		}));

		expect(await readAgentSettings()).toEqual({
			credentials: {
				groq: {
					apiKey: "gk",
				},
				"github-copilot": {
					oauthToken: "gho_b",
				},
			},
			selectedModel: "groq:llama",
			customProviders: [],
		});
	});

	it("hands the current credential to the updater so it can merge", async () => {
		await updateProviderCredential("github-copilot", () => ({
			oauthToken: "gho_b",
		}));
		await updateProviderCredential("github-copilot", (current) => ({
			...current,
			account: "octocat",
		}));

		expect((await readAgentSettings()).credentials["github-copilot"]).toEqual({
			oauthToken: "gho_b",
			account: "octocat",
		});
	});

	it("clears one provider's credential and leaves the rest", async () => {
		await updateProviderCredential("groq", () => ({
			apiKey: "gk",
		}));
		await updateProviderCredential("mistral", () => ({
			apiKey: "mk",
		}));

		await clearProviderCredential("groq");

		expect(Object.keys((await readAgentSettings()).credentials)).toEqual([
			"mistral",
		]);
	});

	it("persists under the pinned storage key", async () => {
		await writeSelectedModel("groq:llama");
		expect(Object.keys(readBrowserStubStore())).toEqual([
			AGENT_SETTINGS_STORAGE_KEY,
		]);
	});
});

describe("custom providers", () => {
	const ollama = {
		id: "ollama",
		name: "Ollama",
		baseUrl: "http://localhost:11434/v1",
	};

	it("adds one", async () => {
		await upsertCustomProvider(ollama);
		expect((await readAgentSettings()).customProviders).toEqual([
			ollama,
		]);
	});

	it("replaces rather than duplicates on the same id", async () => {
		await upsertCustomProvider(ollama);
		await upsertCustomProvider({
			...ollama,
			name: "Ollama (renamed)",
		});

		const { customProviders } = await readAgentSettings();
		expect(customProviders).toHaveLength(1);
		expect(customProviders[0].name).toBe("Ollama (renamed)");
	});

	it("removes the provider and its credential together", async () => {
		await upsertCustomProvider(ollama);
		await updateProviderCredential("ollama", () => ({
			apiKey: "k",
		}));

		await removeCustomProvider("ollama");

		const settings = await readAgentSettings();
		expect(settings.customProviders).toEqual([]);
		// A stranded credential would make the provider look configured forever.
		expect(settings.credentials.ollama).toBeUndefined();
	});
});
