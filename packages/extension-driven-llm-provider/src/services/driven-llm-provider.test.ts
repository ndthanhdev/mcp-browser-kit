import type { LanguageModel } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { resetBrowserStub } from "../testing/webextension-polyfill-stub";
import { writeSelectedModel } from "./agent-settings-storage";
import { DrivenLlmProvider } from "./driven-llm-provider";
import type { LlmProviderStrategy } from "./providers/llm-provider-strategy";

/** A model stand-in — the registry never inspects it, it only passes it through. */
const fakeModel = (name: string) => name as unknown as LanguageModel;

interface StubOptions {
	configured?: boolean;
	models?: Array<{
		id: string;
		label: string;
	}>;
	listThrows?: boolean;
}

const stubStrategy = (
	id: string,
	{ configured = true, models = [], listThrows = false }: StubOptions = {},
): LlmProviderStrategy => ({
	id,
	label: id.toUpperCase(),
	isConfigured: async () => configured,
	listModels: async () => {
		if (listThrows) {
			throw new Error("boom");
		}
		return models;
	},
	defaultModelId: async () => models[0]?.id,
	createModel: async (modelId: string) => fakeModel(`${id}/${modelId}`),
});

beforeEach(() => {
	resetBrowserStub();
});

describe("listProviders", () => {
	it("qualifies every model with its provider id", async () => {
		const registry = new DrivenLlmProvider([
			stubStrategy("openrouter", {
				models: [
					{
						id: "openai/gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
			stubStrategy("copilot", {
				models: [
					{
						id: "gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
		]);

		expect(await registry.listProviders()).toEqual([
			{
				id: "openrouter:openai/gpt-4o",
				label: "GPT-4o · OPENROUTER",
			},
			{
				id: "copilot:gpt-4o",
				label: "GPT-4o · COPILOT",
			},
		]);
	});

	it("omits unconfigured providers instead of erroring", async () => {
		const registry = new DrivenLlmProvider([
			stubStrategy("copilot", {
				configured: false,
				models: [
					{
						id: "gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
		]);

		expect(await registry.listProviders()).toEqual([]);
	});

	it("keeps working providers visible when one fails to list", async () => {
		const registry = new DrivenLlmProvider([
			stubStrategy("copilot", {
				listThrows: true,
			}),
			stubStrategy("openrouter", {
				models: [
					{
						id: "openai/gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
		]);

		expect(await registry.listProviders()).toEqual([
			{
				id: "openrouter:openai/gpt-4o",
				label: "GPT-4o · OPENROUTER",
			},
		]);
	});
});

describe("getModel", () => {
	const registry = () =>
		new DrivenLlmProvider([
			stubStrategy("openrouter", {
				models: [
					{
						id: "openai/gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
			stubStrategy("copilot", {
				models: [
					{
						id: "claude-sonnet-4",
						label: "Claude Sonnet 4",
					},
				],
			}),
		]);

	it("routes an explicit composite id to the right strategy", async () => {
		expect(await registry().getModel("copilot:claude-sonnet-4")).toBe(
			"copilot/claude-sonnet-4",
		);
	});

	it("falls back to the persisted selection", async () => {
		await writeSelectedModel("copilot:claude-sonnet-4");
		expect(await registry().getModel()).toBe("copilot/claude-sonnet-4");
	});

	it("falls back to the first configured provider's default when nothing is selected", async () => {
		expect(await registry().getModel()).toBe("openrouter/openai/gpt-4o");
	});

	it("skips unconfigured providers when picking a default", async () => {
		const provider = new DrivenLlmProvider([
			stubStrategy("openrouter", {
				configured: false,
				models: [
					{
						id: "openai/gpt-4o",
						label: "GPT-4o",
					},
				],
			}),
			stubStrategy("copilot", {
				models: [
					{
						id: "claude-sonnet-4",
						label: "Claude Sonnet 4",
					},
				],
			}),
		]);

		expect(await provider.getModel()).toBe("copilot/claude-sonnet-4");
	});

	it("explains itself when no provider is configured", async () => {
		const provider = new DrivenLlmProvider([
			stubStrategy("copilot", {
				configured: false,
			}),
		]);

		await expect(provider.getModel()).rejects.toThrow(
			/No language model is configured/,
		);
	});

	it("rejects a malformed composite id", async () => {
		await expect(registry().getModel("gpt-4o")).rejects.toThrow(
			/expected "<provider>:<model>"/,
		);
	});

	it("rejects an unknown provider", async () => {
		await expect(registry().getModel("bedrock:claude")).rejects.toThrow(
			/Unknown LLM provider "bedrock"/,
		);
	});
});
