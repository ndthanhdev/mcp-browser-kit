import type { AgentProgressEvent } from "@mcp-browser-kit/core-extension";
import { describe, expect, it } from "vitest";
import { applyAgentEvent, buildThread, emptyThread } from "./thread-items";

let clock = 0;
const at = () => ++clock;

const userMessage = (content: string): AgentProgressEvent => ({
	type: "user-message",
	sessionId: "s1",
	turnId: "t1",
	at: at(),
	content,
});

const delta = (content: string): AgentProgressEvent => ({
	type: "assistant-message",
	sessionId: "s1",
	turnId: "t1",
	at: at(),
	content,
	done: false,
});

const finalMessage = (content: string): AgentProgressEvent => ({
	type: "assistant-message",
	sessionId: "s1",
	turnId: "t1",
	at: at(),
	content,
	done: true,
});

const toolCall = (toolName: string, args: unknown[] = []): AgentProgressEvent =>
	({
		type: "tool-call",
		sessionId: "s1",
		turnId: "t1",
		at: at(),
		toolName,
		args,
	}) as AgentProgressEvent;

const toolResult = (
	toolName: string,
	outcome: {
		ok: boolean;
		result?: unknown;
		reason?: string;
	},
): AgentProgressEvent =>
	({
		type: "tool-result",
		sessionId: "s1",
		turnId: "t1",
		at: at(),
		toolName,
		...outcome,
	}) as AgentProgressEvent;

describe("streaming assistant text", () => {
	it("folds deltas into one growing row", () => {
		const { items } = buildThread([
			delta("Hello"),
			delta(", "),
			delta("world"),
		]);

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			kind: "assistant",
			content: "Hello, world",
			streaming: true,
		});
	});

	it("replaces rather than appends on the final coalesced message", () => {
		// The final `done` event repeats the whole text. Appending it would render
		// every turn twice over.
		const { items } = buildThread([
			delta("Hello"),
			delta(", world"),
			finalMessage("Hello, world"),
		]);

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			content: "Hello, world",
			streaming: false,
		});
	});

	it("handles a turn that only ever sends the final message", () => {
		const { items } = buildThread([
			finalMessage("All done."),
		]);

		expect(items).toEqual([
			expect.objectContaining({
				kind: "assistant",
				content: "All done.",
				streaming: false,
			}),
		]);
	});

	it("closes a still-streaming row when the turn completes without a final message", () => {
		const { items } = buildThread([
			delta("thinking…"),
			{
				type: "turn-completed",
				sessionId: "s1",
				turnId: "t1",
				at: at(),
			},
		]);

		expect(items[0]).toMatchObject({
			streaming: false,
		});
	});

	it("starts a new row after a tool call interrupts the prose", () => {
		const { items } = buildThread([
			delta("Let me look…"),
			toolCall("getReadableElements"),
			toolResult("getReadableElements", {
				ok: true,
			}),
			delta("Found it."),
		]);

		expect(items.map((item) => item.kind)).toEqual([
			"assistant",
			"tool",
			"assistant",
		]);
		expect(items[2]).toMatchObject({
			content: "Found it.",
		});
	});

	it("starts a new row for the next user turn", () => {
		const { items } = buildThread([
			delta("one"),
			userMessage("again"),
			delta("two"),
		]);

		expect(items.map((item) => item.kind)).toEqual([
			"assistant",
			"user",
			"assistant",
		]);
		expect(items[2]).toMatchObject({
			content: "two",
		});
	});
});

describe("tool rows", () => {
	it("merges a call and its result into one row", () => {
		const { items } = buildThread([
			toolCall("clickOnElement", [
				"42",
				"button",
			]),
			toolResult("clickOnElement", {
				ok: true,
				result: "clicked",
			}),
		]);

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			kind: "tool",
			toolName: "clickOnElement",
			args: [
				"42",
				"button",
			],
			ok: true,
			result: "clicked",
		});
	});

	it("leaves a running call unresolved", () => {
		const { items } = buildThread([
			toolCall("clickOnElement"),
		]);

		expect(items[0]).toHaveProperty("kind", "tool");
		expect(
			(
				items[0] as {
					ok?: boolean;
				}
			).ok,
		).toBeUndefined();
	});

	it("carries a failure reason", () => {
		const { items } = buildThread([
			toolCall("clickOnElement"),
			toolResult("clickOnElement", {
				ok: false,
				reason: "element not found",
			}),
		]);

		expect(items[0]).toMatchObject({
			ok: false,
			reason: "element not found",
		});
	});

	it("matches a result to the most recent unresolved call of that tool", () => {
		const { items } = buildThread([
			toolCall("getReadableElements", [
				"first",
			]),
			toolResult("getReadableElements", {
				ok: true,
				result: "one",
			}),
			toolCall("getReadableElements", [
				"second",
			]),
			toolResult("getReadableElements", {
				ok: true,
				result: "two",
			}),
		]);

		expect(items).toHaveLength(2);
		expect(items[0]).toMatchObject({
			args: [
				"first",
			],
			result: "one",
		});
		expect(items[1]).toMatchObject({
			args: [
				"second",
			],
			result: "two",
		});
	});

	it("ignores a result with no matching call", () => {
		const state = applyAgentEvent(
			emptyThread(),
			toolResult("clickOnElement", {
				ok: true,
			}),
		);

		expect(state.items).toEqual([]);
	});

	it("gives concurrent rows distinct ids", () => {
		const { items } = buildThread([
			toolCall("getReadableElements"),
			toolCall("getReadableElements"),
		]);

		expect(items[0].id).not.toBe(items[1].id);
	});
});

describe("terminal events", () => {
	it("renders an error row", () => {
		const { items } = buildThread([
			delta("working"),
			{
				type: "error",
				sessionId: "s1",
				turnId: "t1",
				at: at(),
				message: "model refused",
			},
		]);

		expect(items[1]).toMatchObject({
			kind: "error",
			message: "model refused",
		});
	});

	it("renders an aborted row", () => {
		const { items } = buildThread([
			{
				type: "aborted",
				sessionId: "s1",
				turnId: "t1",
				at: at(),
			},
		]);

		expect(items[0]).toMatchObject({
			kind: "aborted",
		});
	});
});

describe("non-rendering events", () => {
	it("returns the same state object so React can skip the update", () => {
		const state = emptyThread();

		for (const event of [
			{
				type: "turn-started",
				sessionId: "s1",
				turnId: "t1",
				at: at(),
			},
			{
				type: "session-ended",
				sessionId: "s1",
				at: at(),
			},
		] as AgentProgressEvent[]) {
			expect(applyAgentEvent(state, event)).toBe(state);
		}
	});
});

describe("hydration and live application agree", () => {
	it("produces the same transcript either way", () => {
		const events: AgentProgressEvent[] = [
			userMessage("click checkout"),
			toolCall("getReadableElements"),
			toolResult("getReadableElements", {
				ok: true,
				result: "18 elements",
			}),
			delta("Clicking "),
			delta("now."),
			finalMessage("Clicking now."),
			{
				type: "turn-completed",
				sessionId: "s1",
				turnId: "t1",
				at: at(),
			},
		];

		const hydrated = buildThread(events);
		const live = events.reduce(applyAgentEvent, emptyThread());

		expect(live.items).toEqual(hydrated.items);
		expect(hydrated.items.map((item) => item.kind)).toEqual([
			"user",
			"tool",
			"assistant",
		]);
	});
});
