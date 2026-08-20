import { describe, expect, it, vi } from "vitest";
import {
	discoverModels,
	normalizeBaseUrl,
	toCustomProvider,
	validateBaseUrl,
	validateProviderId,
} from "./custom-providers";

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
	});

describe("normalizeBaseUrl", () => {
	it("strips trailing slashes so /models never doubles up", () => {
		expect(normalizeBaseUrl("http://localhost:11434/v1/")).toBe(
			"http://localhost:11434/v1",
		);
		expect(normalizeBaseUrl("http://localhost:11434/v1///")).toBe(
			"http://localhost:11434/v1",
		);
	});

	it("trims surrounding whitespace from a pasted URL", () => {
		expect(normalizeBaseUrl("  https://api.test/v1  ")).toBe(
			"https://api.test/v1",
		);
	});
});

describe("validateBaseUrl", () => {
	it("accepts http and https", () => {
		expect(validateBaseUrl("http://localhost:1234/v1")).toBeUndefined();
		expect(validateBaseUrl("https://api.test/v1")).toBeUndefined();
	});

	it("rejects an empty value", () => {
		expect(validateBaseUrl("   ")).toMatch(/Enter a base URL/);
	});

	it("rejects a bare host, which would fail much later inside the SDK", () => {
		expect(validateBaseUrl("localhost:1234")).toBeDefined();
	});

	it("rejects non-http protocols", () => {
		expect(validateBaseUrl("ws://localhost:1234")).toMatch(
			/http:\/\/ or https/,
		);
	});
});

describe("validateProviderId", () => {
	it("accepts a plain id", () => {
		expect(validateProviderId("ollama", [])).toBeUndefined();
		expect(validateProviderId("my-proxy.v2_1", [])).toBeUndefined();
	});

	it("rejects a colon — composite model ids split on the first one", () => {
		// "ol:lama:model" would parse as provider "ol", model "lama:model".
		expect(validateProviderId("ol:lama", [])).toMatch(/cannot contain a colon/);
	});

	it("rejects an empty id", () => {
		expect(validateProviderId("  ", [])).toMatch(/Enter an id/);
	});

	it("rejects punctuation that would not round-trip", () => {
		expect(validateProviderId("my provider", [])).toBeDefined();
		expect(validateProviderId("-leading", [])).toBeDefined();
	});

	it("rejects an id already in use", () => {
		expect(
			validateProviderId("groq", [
				"groq",
			]),
		).toMatch(/already in use/);
	});
});

describe("discoverModels", () => {
	it("returns the ids the server lists, sorted", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				data: [
					{
						id: "qwen3-coder",
					},
					{
						id: "gemma3",
					},
				],
			}),
		);

		expect(
			await discoverModels(
				"http://localhost:11434/v1",
				undefined,
				fetchImpl as unknown as typeof fetch,
			),
		).toEqual({
			status: "ok",
			modelIds: [
				"gemma3",
				"qwen3-coder",
			],
		});
	});

	it("hits /models on the normalised base URL", async () => {
		let url: string | undefined;
		const fetchImpl = vi.fn(async (input: unknown) => {
			url = String(input);
			return jsonResponse({
				data: [
					{
						id: "m",
					},
				],
			});
		});

		await discoverModels(
			"http://localhost:11434/v1/",
			undefined,
			fetchImpl as unknown as typeof fetch,
		);

		expect(url).toBe("http://localhost:11434/v1/models");
	});

	it("sends a bearer token when the server needs one", async () => {
		let sent: RequestInit | undefined;
		const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
			sent = init;
			return jsonResponse({
				data: [
					{
						id: "m",
					},
				],
			});
		});

		await discoverModels(
			"https://proxy.test/v1",
			"sk-1",
			fetchImpl as unknown as typeof fetch,
		);

		const headers = (sent?.headers ?? {}) as Record<string, string>;
		expect(headers.authorization).toBe("Bearer sk-1");
	});

	it("omits the header entirely when there is no key", async () => {
		let sent: RequestInit | undefined;
		const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
			sent = init;
			return jsonResponse({
				data: [
					{
						id: "m",
					},
				],
			});
		});

		await discoverModels(
			"http://localhost:11434/v1",
			undefined,
			fetchImpl as unknown as typeof fetch,
		);

		expect((sent?.headers ?? {}) as Record<string, string>).toEqual({});
	});

	it("validates before making a request", async () => {
		const fetchImpl = vi.fn();

		const result = await discoverModels(
			"not-a-url",
			undefined,
			fetchImpl as unknown as typeof fetch,
		);

		expect(result.status).toBe("failed");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("reports the status code on a non-200", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({}, 401));

		expect(
			await discoverModels(
				"https://proxy.test/v1",
				undefined,
				fetchImpl as unknown as typeof fetch,
			),
		).toEqual({
			status: "failed",
			message: expect.stringContaining("401"),
		});
	});

	it("says to load a model when the server lists none", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				data: [],
			}),
		);

		const result = await discoverModels(
			"http://localhost:1234/v1",
			undefined,
			fetchImpl as unknown as typeof fetch,
		);

		expect(result).toMatchObject({
			status: "failed",
			message: expect.stringContaining("load a model"),
		});
	});

	it("blames the server being down rather than surfacing 'Failed to fetch'", async () => {
		const fetchImpl = vi.fn(async () => {
			throw new TypeError("Failed to fetch");
		});

		const result = await discoverModels(
			"http://localhost:11434/v1",
			undefined,
			fetchImpl as unknown as typeof fetch,
		);

		expect(result).toMatchObject({
			status: "failed",
			message: expect.stringContaining("Check the server is running"),
		});
	});

	it("distinguishes a cancellation from a failure", async () => {
		const fetchImpl = vi.fn(async () => {
			const error = new Error("aborted");
			error.name = "AbortError";
			throw error;
		});

		expect(
			await discoverModels(
				"http://localhost:11434/v1",
				undefined,
				fetchImpl as unknown as typeof fetch,
			),
		).toEqual({
			status: "failed",
			message: "Cancelled.",
		});
	});

	it("ignores entries with no id", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				data: [
					{
						id: "good",
					},
					{},
				],
			}),
		);

		expect(
			await discoverModels(
				"http://localhost:1234/v1",
				undefined,
				fetchImpl as unknown as typeof fetch,
			),
		).toMatchObject({
			modelIds: [
				"good",
			],
		});
	});
});

describe("toCustomProvider", () => {
	it("normalises the base URL and trims the id", () => {
		expect(
			toCustomProvider({
				id: "  ollama ",
				name: " Ollama ",
				baseUrl: "http://localhost:11434/v1/",
			}),
		).toEqual({
			id: "ollama",
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
			modelIds: undefined,
		});
	});

	it("falls back to the id when no name is given", () => {
		expect(
			toCustomProvider({
				id: "lmstudio",
				name: "   ",
				baseUrl: "http://localhost:1234/v1",
			}).name,
		).toBe("lmstudio");
	});
});
