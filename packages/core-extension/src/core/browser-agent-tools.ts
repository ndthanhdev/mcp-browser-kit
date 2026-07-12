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
		"tabId from bk:///context; defaults to the session target tab when omitted",
	);

const readablePathSchema = z
	.string()
	.describe(
		"Dot-separated tree path (e.g. 0.2.1) — first element of [path, role, text] tuple from getReadableElements; not a CSS selector",
	);

const xSchema = z
	.number()
	.describe("X coordinate in pixels from a recent captureTab screenshot");
const ySchema = z
	.number()
	.describe("Y coordinate in pixels from a recent captureTab screenshot");
const valueSchema = z.string().describe("Text to enter into the input field");

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

	return {
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
			description: "Click at pixel coordinates in a tab (MV2 only).",
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
			description: "Click an element identified by its readable tree path.",
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
				"Fill text into the element at pixel coordinates (MV2 only).",
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
				"Fill text into the element identified by its readable tree path.",
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
				"Press Enter on the element at pixel coordinates (MV2 only).",
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
				"Press Enter on the element identified by its readable tree path.",
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
				"Show an on-page overlay asking the human to perform a manual step, returning their outcome.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				params: z
					.unknown()
					.describe("ShowHumanHintParams describing the manual step"),
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
					() =>
						// biome-ignore lint/suspicious/noExplicitAny: ShowHumanHintParams is structural; the model supplies it as JSON.
						toolCall.showHumanHint(id, params as any, humanMessage),
				);
			},
		}),
		invokeJsFn: tool({
			description:
				"Run a JavaScript function body in the tab and return its result (MV2 only). Body only, no function wrapper.",
			inputSchema: z.object({
				tabId: tabIdSchema,
				fnBodyCode: z
					.string()
					.describe(
						"Function body only (no wrapper). Example: return document.title;",
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
}
