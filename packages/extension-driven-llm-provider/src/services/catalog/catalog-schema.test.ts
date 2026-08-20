import { describe, expect, it } from "vitest";
import sample from "../../testing/fixtures/models-dev-sample.json" with {
	type: "json",
};
import { pruneCatalog } from "./catalog-schema";

describe("pruneCatalog against a real models.dev slice", () => {
	const catalog = pruneCatalog(sample);

	it("keeps every provider that has a usable model", () => {
		expect(Object.keys(catalog).sort()).toEqual([
			"anthropic",
			"github-copilot",
			"groq",
			"openrouter",
		]);
	});

	it("carries the base URL through for openai-compatible providers", () => {
		expect(catalog["github-copilot"]).toMatchObject({
			npm: "@ai-sdk/openai-compatible",
			api: "https://api.githubcopilot.com",
		});
	});

	it("leaves api undefined for providers whose URL lives in their SDK", () => {
		expect(catalog.anthropic.api).toBeUndefined();
		expect(catalog.anthropic.npm).toBe("@ai-sdk/anthropic");
	});

	it("drops non-tool-calling models — the agent is a tool loop", () => {
		for (const provider of Object.values(catalog)) {
			expect(provider.models.every((model) => model.toolCall)).toBe(true);
		}
		// The fixture deliberately includes one non-tool-calling model per provider.
		const rawCount = Object.values(
			sample as Record<
				string,
				{
					models: Record<string, unknown>;
				}
			>,
		).reduce(
			(total, provider) => total + Object.keys(provider.models).length,
			0,
		);
		const prunedCount = Object.values(catalog).reduce(
			(total, provider) => total + provider.models.length,
			0,
		);
		expect(prunedCount).toBeLessThan(rawCount);
	});

	it("camelCases the snake_case wire fields", () => {
		const model = catalog.anthropic.models[0];
		expect(model).toHaveProperty("releaseDate");
		expect(model).not.toHaveProperty("release_date");
		expect(model).not.toHaveProperty("tool_call");
	});

	it("orders models newest first", () => {
		const dates = catalog.anthropic.models.map(
			(model) => model.releaseDate ?? "",
		);
		expect([
			...dates,
		]).toEqual(
			[
				...dates,
			]
				.sort()
				.reverse(),
		);
	});

	it("defaults env to an array so callers need no null check", () => {
		for (const provider of Object.values(catalog)) {
			expect(Array.isArray(provider.env)).toBe(true);
		}
	});
});

describe("resilience to schema drift", () => {
	/**
	 * The failure mode that matters: models.dev renames or restructures something.
	 * Losing a few models is acceptable; losing the picker is not.
	 */
	it("keeps good providers when one is malformed", () => {
		const catalog = pruneCatalog({
			good: {
				id: "good",
				name: "Good",
				npm: "@ai-sdk/openai-compatible",
				api: "https://example.test/v1",
				models: {
					m: {
						id: "m",
						name: "M",
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: true,
					},
				},
			},
			broken: {
				id: "broken",
				// `name` and `npm` missing entirely
				models: {},
			},
		});

		expect(Object.keys(catalog)).toEqual([
			"good",
		]);
	});

	it("keeps good models when one is malformed", () => {
		const catalog = pruneCatalog({
			p: {
				id: "p",
				name: "P",
				npm: "@ai-sdk/openai-compatible",
				models: {
					ok: {
						id: "ok",
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: true,
					},
					bad: {
						// no id
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: true,
					},
					wrongType: {
						id: 42,
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: true,
					},
				},
			},
		});

		expect(catalog.p.models.map((model) => model.id)).toEqual([
			"ok",
		]);
	});

	it("ignores unknown fields rather than rejecting the document", () => {
		const catalog = pruneCatalog({
			p: {
				id: "p",
				name: "P",
				npm: "@ai-sdk/openai-compatible",
				somethingNew: true,
				models: {
					m: {
						id: "m",
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: true,
						anotherNewField: {
							nested: 1,
						},
					},
				},
			},
		});

		expect(catalog.p.models).toHaveLength(1);
	});

	it("drops providers left with no usable models", () => {
		const catalog = pruneCatalog({
			p: {
				id: "p",
				name: "P",
				npm: "@ai-sdk/openai-compatible",
				models: {
					m: {
						id: "m",
						// biome-ignore lint/style/useNamingConvention: models.dev wire format.
						tool_call: false,
					},
				},
			},
		});

		expect(catalog).toEqual({});
	});

	it("rejects a document that is not an object map", () => {
		expect(() => pruneCatalog([])).toThrow();
		expect(() => pruneCatalog("nope")).toThrow();
	});
});
