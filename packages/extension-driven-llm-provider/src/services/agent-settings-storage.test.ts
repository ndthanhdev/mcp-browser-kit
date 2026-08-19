import { beforeEach, describe, expect, it } from "vitest";
import {
	readBrowserStubStore,
	resetBrowserStub,
} from "../testing/webextension-polyfill-stub";
import {
	AGENT_SETTINGS_STORAGE_KEY,
	parseCompositeModelId,
	readAgentSettings,
	toCompositeModelId,
	updateProviderCredentials,
	writeSelectedModel,
} from "./agent-settings-storage";

beforeEach(() => {
	resetBrowserStub();
});

describe("composite model ids", () => {
	it("splits on the first colon so OpenRouter variant slugs survive", () => {
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
		const composite = toCompositeModelId("copilot", "claude-sonnet-4");
		expect(parseCompositeModelId(composite)).toEqual({
			providerId: "copilot",
			modelId: "claude-sonnet-4",
		});
	});
});

describe("legacy settings migration", () => {
	it("moves openRouterApiKey into the credentials slice", async () => {
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
		});
	});

	it("does not invent an openrouter slice when the legacy key was unset", async () => {
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: {},
		});

		expect(await readAgentSettings()).toEqual({
			credentials: {},
			selectedModel: undefined,
		});
	});

	it("leaves already-migrated settings alone", async () => {
		const current = {
			credentials: {
				copilot: {
					oauthToken: "gho_x",
				},
			},
			selectedModel: "copilot:gpt-4o",
		};
		resetBrowserStub({
			[AGENT_SETTINGS_STORAGE_KEY]: current,
		});

		expect(await readAgentSettings()).toEqual(current);
	});

	it("returns empty settings when nothing is persisted", async () => {
		expect(await readAgentSettings()).toEqual({
			credentials: {},
		});
	});
});

describe("partial writes", () => {
	it("updates one provider's credentials without clobbering the others", async () => {
		await updateProviderCredentials("openrouter", () => ({
			apiKey: "sk-a",
		}));
		await writeSelectedModel("openrouter:openai/gpt-4o");
		await updateProviderCredentials("copilot", () => ({
			oauthToken: "gho_b",
		}));

		expect(await readAgentSettings()).toEqual({
			credentials: {
				openrouter: {
					apiKey: "sk-a",
				},
				copilot: {
					oauthToken: "gho_b",
				},
			},
			selectedModel: "openrouter:openai/gpt-4o",
		});
	});

	it("hands the current slice to the updater so it can merge", async () => {
		await updateProviderCredentials("copilot", () => ({
			oauthToken: "gho_b",
		}));
		await updateProviderCredentials("copilot", (current) => ({
			...current,
			login: "octocat",
		}));

		const settings = await readAgentSettings();
		expect(settings.credentials.copilot).toEqual({
			oauthToken: "gho_b",
			login: "octocat",
		});
	});

	it("persists under the pinned storage key", async () => {
		await writeSelectedModel("copilot:gpt-4o");
		expect(Object.keys(readBrowserStubStore())).toEqual([
			AGENT_SETTINGS_STORAGE_KEY,
		]);
	});
});
