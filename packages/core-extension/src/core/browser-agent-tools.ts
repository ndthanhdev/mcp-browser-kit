import { type Tool, tool } from "ai";
import { z } from "zod";
import type { ExtensionToolCallInputPort } from "../input-ports";
import type { ExtensionToolName } from "../types";

/**
 * Context the tool mapper needs from an active session. Tab-scoped tools accept
 * `tabId` in their schema, but the model often omits it; when it does we fall
 * back to the session's {@link import("../types").AgentTarget}`.tabId`.
 */
export interface BrowserAgentToolContext {
	/** Default tab for tab-scoped tools when the model omits `tabId`. */
	readonly defaultTabId?: string;
	/** Default window for `openTab` when the model omits `windowId`. */
	readonly defaultWindowId?: string;
	/**
	 * Tools the connected extension supports (e.g. MV3 has no screenshots or
	 * coordinates); others are not offered to the model. All tools when omitted.
	 */
	readonly availableTools?: readonly ExtensionToolName[];
	/** Hides {@link MV2_ONLY_AGENT_TOOLS} when 3 and `availableTools` is not set. */
	readonly manifestVersion?: number;
}

/**
 * Emitted for each tool invocation so tool activity stays robust regardless of
 * whether the harness surfaces tool parts in its own stream. `toolName` reuses
 * {@link ExtensionToolName}; the result mirrors the server tool envelope.
 */
export interface BrowserAgentToolEvents {
	onToolCall(toolName: ExtensionToolName, args: unknown[]): void;
	onToolResult(
		toolName: ExtensionToolName,
		outcome: {
			ok: boolean;
			result?: unknown;
			reason?: string;
		},
	): void;
}

const tabIdSchema = z
	.string()
	.optional()
	.describe(
		'Tab id from getExtensionContext availableTabs[].id (e.g. "1842") — not an element id like f1:e1. Omit it to use the session target tab.',
	);

const readablePathSchema = z
	.string()
	.describe(
		"Stable element id (e.g. f1:e1a) — first element of [path, role, text] tuple from getReadableElements; not a CSS selector",
	);

const xSchema = z
	.number()
	.describe("X coordinate in pixels from a recent captureTab screenshot");
const ySchema = z
	.number()
	.describe("Y coordinate in pixels from a recent captureTab screenshot");
const valueSchema = z.string().describe("Text to enter into the input field");

/** Tools that need MV2 APIs (screenshots, coordinates, page scripts); MV3 extensions lack them. */
export const MV2_ONLY_AGENT_TOOLS: readonly ExtensionToolName[] = [
	"captureTab",
	"clickOnCoordinates",
	"fillTextToCoordinates",
	"hitEnterOnCoordinates",
	"invokeJsFn",
];

const humanHintParamsSchema = z
	.object({
		action: z
			.enum([
				"click",
				"fill",
				"hit-enter",
			])
			.describe("What the human should do on the target"),
		message: z
			.string()
			.describe("Why the human has to do it, e.g. the file to pick"),
		readablePath: z
			.string()
			.optional()
			.describe(
				"Target element id from getReadableElements (preferred); omit x and y when set",
			),
		x: xSchema.optional(),
		y: ySchema.optional(),
		value: z
			.string()
			.optional()
			.describe("Text the human should enter; required for fill"),
	})
	.describe(
		"The manual step: one target (readablePath, or x and y), never both",
	);

/**
 * Build the AI SDK `tool()` set that bridges the model to the browser by
 * wrapping every {@link ExtensionToolCallInputPort} method. Each `execute`:
 *
 * 1. emits a `tool-call` event (`toolName` + positional `args`),
 * 2. calls the matching extension tool method,
 * 3. emits a `tool-result` event (`ok`/`result` on success, `ok:false`/`reason`
 *    on throw) and returns the result (or rethrows so the model sees the error).
 *
 * @param toolCall  the {@link ExtensionToolCallInputPort} singleton.
 * @param events    durable tool-event sink (the use case's `emit`).
 * @param ctx       per-session defaults (resolved fresh each turn).
 */
export function createBrowserAgentTools(
	toolCall: ExtensionToolCallInputPort,
	events: BrowserAgentToolEvents,
	ctx: BrowserAgentToolContext,
): Record<string, Tool> {
	/**
	 * Wrap a call in the tool-call → invoke → tool-result envelope. `args` is the
	 * positional argument list passed to the extension method, surfaced verbatim
	 * on the `tool-call`/`tool-result` events.
	 */
	const run = async <T>(
		toolName: ExtensionToolName,
		args: unknown[],
		invoke: () => Promise<T>,
	): Promise<T> => {
		events.onToolCall(toolName, args);
		try {
			const result = await invoke();
			events.onToolResult(toolName, {
				ok: true,
				result,
			});
			return result;
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			events.onToolResult(toolName, {
				ok: false,
				reason,
			});
			throw error;
		}
	};

	/** Resolve the effective tab id, preferring the model's value. */
	const resolveTabId = (tabId?: string): string => {
		const resolved = tabId ?? ctx.defaultTabId;
		if (!resolved) {
			throw new Error(
				"tabId is required: provide one or set the session target tab",
			);
		}
		return resolved;
	};

	const tools: Record<string, Tool> = {
		captureTab: tool({
			description: "Capture a screenshot of the given tab (MV2 only).",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"captureTab",
					[
						id,
					],
					() => toolCall.captureTab(id),
				);
			},
		}),
		clickOnCoordinates: tool({
			description:
				"Click at pixel coordinates in a tab. Take x/y from captureTab (MV2 only); otherwise prefer clickOnElement.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				x: xSchema,
				y: ySchema,
			}),
			execute: ({ tabId, x, y }) => {
				const id = resolveTabId(tabId);
				return run(
					"clickOnCoordinates",
					[
						id,
						x,
						y,
					],
					() => toolCall.clickOnCoordinates(id, x, y),
				);
			},
		}),
		clickOnElement: tool({
			description:
				'Click an element identified by its readable element id. Never click CAPTCHA/"I\'m not a robot"/2FA elements or file inputs ("Choose file"/"Browse"/"Upload") — those are human-only steps: use showHumanHint.',
			inputSchema: z.object({
				tabId: tabIdSchema,
				readablePath: readablePathSchema,
			}),
			execute: ({ tabId, readablePath }) => {
				const id = resolveTabId(tabId);
				return run(
					"clickOnElement",
					[
						id,
						readablePath,
					],
					() => toolCall.clickOnElement(id, readablePath),
				);
			},
		}),
		closeTab: tool({
			description: "Close the given tab.",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"closeTab",
					[
						id,
					],
					() => toolCall.closeTab(id),
				);
			},
		}),
		fillTextToCoordinates: tool({
			description:
				"Fill text into the element at pixel coordinates. Take x/y from captureTab (MV2 only); otherwise prefer fillTextToElement.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				x: xSchema,
				y: ySchema,
				value: valueSchema,
			}),
			execute: ({ tabId, x, y, value }) => {
				const id = resolveTabId(tabId);
				return run(
					"fillTextToCoordinates",
					[
						id,
						x,
						y,
						value,
					],
					() => toolCall.fillTextToCoordinates(id, x, y, value),
				);
			},
		}),
		fillTextToElement: tool({
			description:
				"Fill text into the element identified by its readable element id.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				readablePath: readablePathSchema,
				value: valueSchema,
			}),
			execute: ({ tabId, readablePath, value }) => {
				const id = resolveTabId(tabId);
				return run(
					"fillTextToElement",
					[
						id,
						readablePath,
						value,
					],
					() => toolCall.fillTextToElement(id, readablePath, value),
				);
			},
		}),
		loadTabContext: tool({
			description:
				"Load the readable context (text + element records) for a tab.",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"loadTabContext",
					[
						id,
					],
					() => toolCall.loadTabContext(id),
				);
			},
		}),
		getReadableElements: tool({
			description:
				"Get the readable element records (path/role/text tuples) for a tab.",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"getReadableElements",
					[
						id,
					],
					() => toolCall.getReadableElements(id),
				);
			},
		}),
		getReadableText: tool({
			description: "Get the readable text content of a tab.",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"getReadableText",
					[
						id,
					],
					() => toolCall.getReadableText(id),
				);
			},
		}),
		getSelection: tool({
			description: "Get the currently selected text in a tab.",
			inputSchema: z.object({
				tabId: tabIdSchema,
			}),
			execute: ({ tabId }) => {
				const id = resolveTabId(tabId);
				return run(
					"getSelection",
					[
						id,
					],
					() => toolCall.getSelection(id),
				);
			},
		}),
		hitEnterOnCoordinates: tool({
			description:
				"Press Enter on the element at pixel coordinates. Take x/y from captureTab (MV2 only); otherwise prefer hitEnterOnElement.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				x: xSchema,
				y: ySchema,
			}),
			execute: ({ tabId, x, y }) => {
				const id = resolveTabId(tabId);
				return run(
					"hitEnterOnCoordinates",
					[
						id,
						x,
						y,
					],
					() => toolCall.hitEnterOnCoordinates(id, x, y),
				);
			},
		}),
		hitEnterOnElement: tool({
			description:
				"Press Enter on the element identified by its readable element id.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				readablePath: readablePathSchema,
			}),
			execute: ({ tabId, readablePath }) => {
				const id = resolveTabId(tabId);
				return run(
					"hitEnterOnElement",
					[
						id,
						readablePath,
					],
					() => toolCall.hitEnterOnElement(id, readablePath),
				);
			},
		}),
		showHumanHint: tool({
			description:
				"Highlight an element and ask the human to do a step tools cannot: CAPTCHA, 2FA, file inputs (picking a file), irreversible confirmations, or repeated tool failures. Call it first for those steps instead of clicking or running JavaScript, and target the element by readablePath. Afterwards, end your turn and let the human act — do not click or submit that step yourself.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				params: humanHintParamsSchema,
				humanMessage: z
					.string()
					.describe("Human-facing instruction shown in the overlay"),
			}),
			execute: ({ tabId, params, humanMessage }) => {
				const id = resolveTabId(tabId);
				return run(
					"showHumanHint",
					[
						id,
						params,
						humanMessage,
					],
					() => toolCall.showHumanHint(id, params, humanMessage),
				);
			},
		}),
		invokeJsFn: tool({
			description:
				"Run a JavaScript function body in the tab and return its result (MV2 only). Body only, no function wrapper, and it must use return.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				fnBodyCode: z
					.string()
					.describe(
						"Function body only (no wrapper); it must return the result, or the call yields nothing. Example: return document.querySelectorAll('img').length;",
					),
			}),
			execute: ({ tabId, fnBodyCode }) => {
				const id = resolveTabId(tabId);
				return run(
					"invokeJsFn",
					[
						id,
						fnBodyCode,
					],
					() => toolCall.invokeJsFn(id, fnBodyCode),
				);
			},
		}),
		getExtensionContext: tool({
			description:
				"Get the extension context: available tabs, windows, tools, and browser info.",
			inputSchema: z.object({}),
			execute: () =>
				run("getExtensionContext", [], () => toolCall.getExtensionContext()),
		}),
		openTab: tool({
			description: "Open a new tab at the given URL in a window.",
			inputSchema: z.object({
				url: z
					.string()
					.describe("URL to open, including scheme (e.g. https://example.com)"),
				windowId: z
					.string()
					.optional()
					.describe(
						"windowId to open in; defaults to the session target window",
					),
			}),
			execute: ({ url, windowId }) => {
				const win = windowId ?? ctx.defaultWindowId;
				if (!win) {
					throw new Error(
						"windowId is required: provide one or set the session target window",
					);
				}
				return run(
					"openTab",
					[
						url,
						win,
					],
					() => toolCall.openTab(url, win),
				);
			},
		}),
	};

	const { availableTools, manifestVersion } = ctx;
	// An empty list means the extension did not report its tools, not that it has none.
	const offered = (name: string): boolean => {
		if (name === "getExtensionContext") return true;
		if (availableTools && availableTools.length > 0) {
			return availableTools.includes(name as ExtensionToolName);
		}
		return !(
			manifestVersion === 3 &&
			MV2_ONLY_AGENT_TOOLS.includes(name as ExtensionToolName)
		);
	};
	return Object.fromEntries(
		Object.entries(tools).filter(([name]) => offered(name)),
	);
}
