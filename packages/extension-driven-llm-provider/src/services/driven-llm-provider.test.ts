import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBrowserStub } from "../testing/webextension-polyfill-stub";
import { upsertConnection, writeSelectedModel } from "./agent-settings-storage";
import { DrivenLlmProvider } from "./driven-llm-provider";
import { fetchModelIds, validateBaseUrl } from "./model-list";

const modelsResponse = (ids: string[]) =>
	new Response(
		JSON.stringify({
			data: ids.map((id) => ({
				id,
			})),
		}),
		{
			status: 200,
		},
	);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	resetBrowserStub();
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchModelIds", () => {
	it("reads ids from GET {baseUrl}/models with the key as a bearer", async () => {
		fetchMock.mockResolvedValue(
			modelsResponse([
				"gpt-4o",
				"gpt-4.1",
			]),
		);

		const result = await fetchModelIds({
			baseUrl: "https://api.openai.com/v1/",
			apiKey: "sk-test",
			headers: {
				"x-extra": "1",
			},
		});

		expect(result).toEqual({
			status: "ok",
			modelIds: [
				"gpt-4.1",
				"gpt-4o",
			],
		});
		expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/models", {
			headers: {
				// biome-ignore lint/style/useNamingConvention: HTTP header name.
				Authorization: "Bearer sk-test",
				"x-extra": "1",
			},
		});
	});

	it("reports HTTP errors instead of throwing", async () => {
		fetchMock.mockResolvedValue(
			new Response("nope", {
				status: 401,
				statusText: "Unauthorized",
			}),
		);
		expect(
			await fetchModelIds({
				baseUrl: "https://x.test/v1",
			}),
		).toEqual({
			status: "failed",
			message: "The endpoint answered 401 Unauthorized: nope",
		});
	});

	it.each([
		[
			"OpenAI-style",
			{
				error: {
					message: "Incorrect API key provided.",
				},
			},
			"Incorrect API key provided.",
		],
		[
			"string error",
			{
				error: "Incorrect API key provided.",
			},
			"Incorrect API key provided.",
		],
		[
			"detail",
			{
				detail: "Invalid API Key",
			},
			"Invalid API Key",
		],
	])(
		"includes the provider's %s error message",
		async (_shape, body, reason) => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify(body), {
					status: 401,
				}),
			);
			expect(
				await fetchModelIds({
					baseUrl: "https://x.test/v1",
				}),
			).toEqual({
				status: "failed",
				message: `The endpoint answered 401: ${reason}`,
			});
		},
	);

	it("reports network errors instead of throwing", async () => {
		fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
		expect(
			await fetchModelIds({
				baseUrl: "http://localhost:11434/v1",
			}),
		).toEqual({
			status: "failed",
			message:
				"Could not reach http://localhost:11434 (Failed to fetch). Check the URL and that the server is running.",
		});
	});
});

describe("validateBaseUrl", () => {
	it("accepts http and https", () => {
		expect(validateBaseUrl("http://localhost:1234/v1")).toBeUndefined();
		expect(validateBaseUrl("https://api.x.ai/v1")).toBeUndefined();
	});

	it("rejects other schemes and garbage", () => {
		expect(validateBaseUrl("ftp://x")).toBeDefined();
		expect(validateBaseUrl("not a url")).toBeDefined();
	});
});

describe("DrivenLlmProvider", () => {
	it("lists discovered models per connection", async () => {
		await upsertConnection({
			id: "openai",
			name: "OpenAI",
			baseUrl: "https://api.openai.com/v1",
			apiKey: "sk",
		});
		fetchMock.mockResolvedValue(
			modelsResponse([
				"gpt-4o",
			]),
		);

		expect(await new DrivenLlmProvider().listProviders()).toEqual([
			{
				id: "openai:gpt-4o",
				label: "gpt-4o · OpenAI",
			},
		]);
	});

	it("falls back to the manual model list when discovery fails", async () => {
		await upsertConnection({
			id: "proxy",
			name: "Proxy",
			baseUrl: "https://proxy.test/v1",
			models: [
				"my-model",
			],
		});
		fetchMock.mockResolvedValue(
			new Response("", {
				status: 404,
			}),
		);

		expect(await new DrivenLlmProvider().listProviders()).toEqual([
			{
				id: "proxy:my-model",
				label: "my-model · Proxy",
			},
		]);
	});

	it("reuses a discovered list instead of refetching", async () => {
		await upsertConnection({
			id: "openai",
			name: "OpenAI",
			baseUrl: "https://api.openai.com/v1",
		});
		fetchMock.mockImplementation(async () =>
			modelsResponse([
				"gpt-4o",
			]),
		);
		const provider = new DrivenLlmProvider();

		await provider.listProviders();
		await provider.listProviders();

		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("builds the selected model", async () => {
		await upsertConnection({
			id: "ollama",
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
		});
		await writeSelectedModel("ollama:llama3:8b");

		const model = await new DrivenLlmProvider().getModel();

		expect(model).toMatchObject({
			modelId: "llama3:8b",
			provider: expect.stringContaining("ollama"),
		});
	});

	it("explains when nothing is configured", async () => {
		await expect(new DrivenLlmProvider().getModel()).rejects.toThrow(
			/No language model is configured/,
		);
	});

	it("explains when the selected connection is gone", async () => {
		await writeSelectedModel("gone:gpt-4o");
		await expect(new DrivenLlmProvider().getModel()).rejects.toThrow(
			/"gone" no longer exists/,
		);
	});
});
