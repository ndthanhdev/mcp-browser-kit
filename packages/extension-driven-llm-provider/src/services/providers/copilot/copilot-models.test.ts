import { describe, expect, it } from "vitest";
import { copilotModelEntry } from "../../../testing/github-wire-fixtures";
import { selectUsableCopilotModels } from "./copilot-models";

const select = (entries: Record<string, unknown>[]) =>
	selectUsableCopilotModels(
		entries as Parameters<typeof selectUsableCopilotModels>[0],
	);

describe("selectUsableCopilotModels", () => {
	it("keeps chat models that support tool calling", () => {
		expect(
			select([
				copilotModelEntry("gpt-4o"),
			]),
		).toEqual([
			{
				id: "gpt-4o",
				label: "GPT-4O",
			},
		]);
	});

	it("drops models without tool calling — the agent is a tool loop", () => {
		expect(
			select([
				copilotModelEntry("no-tools", {
					toolCalls: false,
				}),
				copilotModelEntry("unstated-tools", {
					toolCalls: null,
				}),
			]),
		).toEqual([]);
	});

	it("drops embedding models that share the endpoint", () => {
		expect(
			select([
				copilotModelEntry("text-embedding-3-small", {
					type: "embeddings",
				}),
			]),
		).toEqual([]);
	});

	it("hides models the official picker hides", () => {
		expect(
			select([
				copilotModelEntry("internal-alias", {
					pickerEnabled: false,
				}),
			]),
		).toEqual([]);
	});

	it("keeps models that don't state a picker preference", () => {
		expect(
			select([
				copilotModelEntry("gpt-4o"),
			]),
		).toHaveLength(1);
	});

	it("collapses ids Copilot lists once per picker group", () => {
		expect(
			select([
				copilotModelEntry("gpt-4o"),
				copilotModelEntry("gpt-4o"),
			]),
		).toHaveLength(1);
	});

	it("falls back to the id when a model has no display name", () => {
		expect(
			select([
				copilotModelEntry("claude-sonnet-4", {
					name: null,
				}),
			]),
		).toEqual([
			{
				id: "claude-sonnet-4",
				label: "claude-sonnet-4",
			},
		]);
	});

	it("ignores entries with no id", () => {
		expect(
			select([
				copilotModelEntry("gpt-4o", {
					omitId: true,
				}),
			]),
		).toEqual([]);
	});

	it("preserves the order Copilot returned", () => {
		expect(
			select([
				copilotModelEntry("b"),
				copilotModelEntry("a"),
			]).map((model) => model.id),
		).toEqual([
			"b",
			"a",
		]);
	});
});
