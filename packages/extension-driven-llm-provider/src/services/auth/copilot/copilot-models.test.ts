import { describe, expect, it, vi } from "vitest";
import { strictFetch } from "../../../testing/strict-fetch";
import { fetchCopilotModels } from "./copilot-models";

const modelsResponse =
	(entries: Record<string, unknown>[]): (() => Response) =>
	() =>
		Response.json({
			data: entries,
		});

const chatModel = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	name: `${id} display`,
	capabilities: {
		type: "chat",
		supports: {
			// biome-ignore lint/style/useNamingConvention: Copilot wire format.
			tool_calls: true,
		},
	},
	...extra,
});

describe("fetchCopilotModels", () => {
	it("returns the chat models the account may use", async () => {
		const impl = vi.fn(
			modelsResponse([
				chatModel("gpt-5"),
			]),
		);

		await expect(
			fetchCopilotModels("gho_x", {
				fetchImpl: vi.fn(strictFetch(impl)),
			}),
		).resolves.toEqual([
			{
				id: "gpt-5",
				name: "gpt-5 display",
				supportsTools: true,
				pickerEnabled: true,
				chat: true,
			},
		]);
	});

	it("prefers chat models over embeddings when both are present", async () => {
		// The picker is for chat; an embedding model selected as the agent's brain
		// fails at the first turn.
		const impl = vi.fn(
			modelsResponse([
				chatModel("gpt-5"),
				{
					id: "text-embedding-3",
					capabilities: {
						type: "embeddings",
					},
				},
			]),
		);

		const models = await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect(models.map((model) => model.id)).toEqual([
			"gpt-5",
		]);
	});

	it("prefers picker-visible models when both are present", async () => {
		const impl = vi.fn(
			modelsResponse([
				chatModel("gpt-5"),
				chatModel("gpt-4-internal", {
					// biome-ignore lint/style/useNamingConvention: Copilot wire format.
					model_picker_enabled: false,
				}),
			]),
		);

		const models = await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect(models.map((model) => model.id)).toEqual([
			"gpt-5",
		]);
	});

	it("keeps a model that omits the picker flag", async () => {
		// Absent is not the same as false — only an explicit false hides a model.
		const impl = vi.fn(
			modelsResponse([
				chatModel("gpt-5"),
			]),
		);

		const models = await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect(models).toHaveLength(1);
	});

	it("reports whether a model can call tools", async () => {
		const impl = vi.fn(
			modelsResponse([
				chatModel("no-tools", {
					capabilities: {
						type: "chat",
						supports: {},
					},
				}),
			]),
		);

		const models = await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect(models[0]?.supportsTools).toBe(false);
	});

	it("falls back to the model id when no display name is sent", async () => {
		const impl = vi.fn(
			modelsResponse([
				{
					id: "gpt-5",
					capabilities: {
						type: "chat",
					},
				},
			]),
		);

		const models = await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect(models[0]?.name).toBe("gpt-5");
	});

	it("sends the bearer and the pinned API version", async () => {
		const impl = vi.fn(modelsResponse([]));

		await fetchCopilotModels("gho_secret", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		const headers = new Headers(
			((impl.mock.calls[0] as unknown[])[1] as RequestInit).headers,
		);
		expect(headers.get("authorization")).toBe("Bearer gho_secret");
		expect(headers.get("x-github-api-version")).toBeTruthy();
	});

	it("throws on a rejection so the caller can fall back", async () => {
		const impl = vi.fn(
			() =>
				new Response("nope", {
					status: 401,
				}),
		);

		await expect(
			fetchCopilotModels("gho_x", {
				fetchImpl: vi.fn(strictFetch(impl)),
			}),
		).rejects.toThrow(/\(401\)/);
	});

	it("targets the enterprise host when one is stored", async () => {
		const impl = vi.fn(modelsResponse([]));

		await fetchCopilotModels("gho_x", {
			enterpriseDomain: "acme.ghe.com",
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect((impl.mock.calls[0] as unknown[])[0]).toBe(
			"https://copilot-api.acme.ghe.com/models",
		);
	});
});

describe("narrowing never empties the list", () => {
	const entry = (
		id: string,
		options: {
			chat?: boolean;
			picker?: boolean;
			tools?: boolean;
		} = {},
	) => ({
		id,
		name: id,
		...(options.picker === false
			? {
					// biome-ignore lint/style/useNamingConvention: Copilot wire format.
					model_picker_enabled: false,
				}
			: {}),
		capabilities: {
			type: options.chat === false ? "embeddings" : "chat",
			supports: {
				// biome-ignore lint/style/useNamingConvention: Copilot wire format.
				tool_calls: options.tools !== false,
			},
		},
	});

	const fetchWith = async (entries: Record<string, unknown>[]) =>
		fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(
				strictFetch(() =>
					Response.json({
						data: entries,
					}),
				),
			),
		});

	it("keeps picker-hidden models when they are all there is", async () => {
		// The reported bug: an account served only legacy models has every one of
		// them flagged picker-disabled, so applying that rule left nothing and the
		// UI offered "choose one of:" followed by no models.
		const models = await fetchWith([
			entry("gpt-4o", {
				picker: false,
			}),
			entry("gpt-3.5-turbo", {
				picker: false,
			}),
		]);

		expect(models.map((model) => model.id)).toEqual([
			"gpt-4o",
			"gpt-3.5-turbo",
		]);
	});

	it("still prefers picker-enabled models when some exist", async () => {
		const models = await fetchWith([
			entry("gpt-4o", {
				picker: false,
			}),
			entry("gpt-5.6-sol"),
		]);

		expect(models.map((model) => model.id)).toEqual([
			"gpt-5.6-sol",
		]);
	});

	it("keeps models without tool support when none advertise it", async () => {
		const models = await fetchWith([
			entry("gpt-4o", {
				tools: false,
			}),
		]);

		expect(models).toHaveLength(1);
	});

	it("still prefers tool-capable models when some exist", async () => {
		const models = await fetchWith([
			entry("no-tools", {
				tools: false,
			}),
			entry("tools"),
		]);

		expect(models.map((model) => model.id)).toEqual([
			"tools",
		]);
	});

	it("never returns nothing for a non-empty response", async () => {
		const models = await fetchWith([
			entry("embed-only", {
				chat: false,
				picker: false,
				tools: false,
			}),
		]);

		expect(models).toHaveLength(1);
	});
});
