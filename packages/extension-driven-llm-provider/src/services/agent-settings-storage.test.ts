import { beforeEach, describe, expect, it } from "vitest";
import {
	readBrowserStubStore,
	resetBrowserStub,
} from "../testing/webextension-polyfill-stub";
import {
	AGENT_SETTINGS_STORAGE_KEY,
	parseCompositeModelId,
	readAgentSettings,
	removeConnection,
	toCompositeModelId,
	upsertConnection,
	writeSelectedModel,
} from "./agent-settings-storage";

const ollama = {
	id: "ollama",
	name: "Ollama",
	baseUrl: "http://localhost:11434/v1",
};

beforeEach(() => {
	resetBrowserStub();
});

describe("composite model ids", () => {
	it("splits on the first colon so tagged model ids survive", () => {
		expect(parseCompositeModelId("ollama:llama3:8b")).toEqual({
			connectionId: "ollama",
			modelId: "llama3:8b",
		});
	});

	it("rejects ids with no connection or no model", () => {
		expect(parseCompositeModelId("gpt-4o")).toBeUndefined();
		expect(parseCompositeModelId(":gpt-4o")).toBeUndefined();
		expect(parseCompositeModelId("openai:")).toBeUndefined();
	});

	it("round-trips", () => {
		expect(
			parseCompositeModelId(toCompositeModelId("openai", "gpt-4o")),
		).toEqual({
			connectionId: "openai",
			modelId: "gpt-4o",
		});
	});
});

describe("agent settings", () => {
	it("starts empty", async () => {
		expect(await readAgentSettings()).toEqual({
			connections: [],
		});
	});

	it("ignores settings stored under older keys", async () => {
		resetBrowserStub({
			"mbk.agent.settings": {
				credentials: {
					openrouter: {
						apiKey: "sk-old",
					},
				},
			},
		});
		expect((await readAgentSettings()).connections).toEqual([]);
	});

	it("adds, replaces and removes connections", async () => {
		await upsertConnection(ollama);
		await upsertConnection({
			...ollama,
			name: "Local",
		});
		expect((await readAgentSettings()).connections).toEqual([
			{
				...ollama,
				name: "Local",
			},
		]);

		await removeConnection("ollama");
		expect((await readAgentSettings()).connections).toEqual([]);
	});

	it("clears the selection when its connection is removed", async () => {
		await upsertConnection(ollama);
		await writeSelectedModel("ollama:llama3");
		await removeConnection("ollama");
		expect((await readAgentSettings()).selectedModel).toBeUndefined();
	});

	it("keeps the selection when another connection is removed", async () => {
		await upsertConnection(ollama);
		await upsertConnection({
			...ollama,
			id: "other",
		});
		await writeSelectedModel("ollama:llama3");
		await removeConnection("other");
		expect((await readAgentSettings()).selectedModel).toBe("ollama:llama3");
	});

	it("persists under the versioned key", async () => {
		await upsertConnection(ollama);
		expect(readBrowserStubStore()[AGENT_SETTINGS_STORAGE_KEY]).toEqual({
			connections: [
				ollama,
			],
		});
	});
});
