import type { AgentSession } from "@mcp-browser-kit/core-extension";
import type { ThreadItem } from "@/types/thread-item";

/**
 * Mock data for the sidepanel chat UI.
 *
 * The components are presentational only — nothing here is wired to the
 * background service worker (the `AgentRpcController` in
 * `docs/architecture.md` is unbuilt). These fixtures pose the views in the
 * states worth reviewing: a finished turn with tool activity, a turn still
 * streaming, a failed turn, and an empty thread.
 */

/**
 * Anchored to load time so the rendered relative times ("4m ago") stay
 * plausible rather than drifting to an absolute date in the past.
 */
const now = Date.now();
const minutes = (count: number) => now - count * 60_000;

export const mockSessions: AgentSession[] = [
	{
		sessionId: "session-checkout",
		status: "idle",
		title: "Find the checkout button",
		createdAt: minutes(45),
		updatedAt: minutes(41),
	},
	{
		sessionId: "session-release-notes",
		status: "running",
		title: "Summarise the release notes",
		createdAt: minutes(12),
		updatedAt: minutes(1),
	},
	{
		sessionId: "session-signup",
		status: "error",
		title: "Fill in the signup form",
		createdAt: minutes(180),
		updatedAt: minutes(174),
	},
	{
		sessionId: "session-empty",
		status: "idle",
		title: "New chat",
		createdAt: minutes(2),
		updatedAt: minutes(2),
	},
];

/** The session the panel opens on, and the row marked selected in the list. */
export const mockActiveSessionId = "session-checkout";

/** An `idle` thread: a completed turn with two successful tool calls. */
const checkoutThread: ThreadItem[] = [
	{
		kind: "user",
		id: "checkout-user-1",
		at: minutes(44),
		content: "Find the checkout button on this page and click it.",
	},
	{
		kind: "tool",
		id: "checkout-tool-1",
		at: minutes(43),
		toolName: "getReadableElements",
		args: [
			"42",
		],
		ok: true,
		result: "18 readable elements",
	},
	{
		kind: "tool",
		id: "checkout-tool-2",
		at: minutes(42),
		toolName: "clickOnElement",
		args: [
			"42",
			"main>div:nth-child(3)>button",
		],
		ok: true,
	},
	{
		kind: "assistant",
		id: "checkout-assistant-1",
		at: minutes(41),
		content:
			"Found the checkout button in the cart summary and clicked it. The page has navigated to the payment step.",
		streaming: false,
	},
];

/** A `running` thread: the assistant message is still streaming in. */
const releaseNotesThread: ThreadItem[] = [
	{
		kind: "user",
		id: "release-notes-user-1",
		at: minutes(3),
		content: "Summarise the release notes on this tab in three bullets.",
	},
	{
		kind: "tool",
		id: "release-notes-tool-1",
		at: minutes(2),
		toolName: "getReadableElements",
		args: [
			"17",
		],
		ok: true,
		result: "204 readable elements",
	},
	{
		kind: "assistant",
		id: "release-notes-assistant-1",
		at: minutes(1),
		content: "Here is what changed in this release:\n\n- Sidepanel chat",
		streaming: true,
	},
];

/** An `error` thread: a failed tool result followed by a turn error. */
const signupThread: ThreadItem[] = [
	{
		kind: "user",
		id: "signup-user-1",
		at: minutes(176),
		content: "Fill in the signup form with a throwaway email address.",
	},
	{
		kind: "tool",
		id: "signup-tool-1",
		at: minutes(175),
		toolName: "fillTextToElement",
		args: [
			"88",
			"form>input[name=email]",
			"someone@example.com",
		],
		ok: false,
		reason: "No element matched readable path form>input[name=email]",
	},
	{
		kind: "error",
		id: "signup-error-1",
		at: minutes(174),
		message: "Turn failed: the signup form was not found on the active tab.",
	},
];

/** Rendered transcripts, keyed by `sessionId`. */
export const mockThreads: Record<string, ThreadItem[]> = {
	"session-checkout": checkoutThread,
	"session-release-notes": releaseNotesThread,
	"session-signup": signupThread,
	"session-empty": [],
};

/** How each thread is posed, since no component holds state of its own. */
export interface MockThreadState {
	/** Show the typing indicator below the last row. */
	typing: boolean;
	/** Text sitting in the composer. */
	draft: string;
	/** Tool rows rendered expanded, so the detail panel is reviewable. */
	expandedToolIds: string[];
}

export const mockThreadStates: Record<string, MockThreadState> = {
	"session-checkout": {
		typing: false,
		draft: "",
		expandedToolIds: [
			"checkout-tool-2",
		],
	},
	"session-release-notes": {
		typing: true,
		draft: "",
		expandedToolIds: [],
	},
	"session-signup": {
		typing: false,
		draft: "Try again, the form is inside the modal",
		expandedToolIds: [
			"signup-tool-1",
		],
	},
	"session-empty": {
		typing: false,
		draft: "",
		expandedToolIds: [],
	},
};
