import type { AgentProgressEvent } from "@mcp-browser-kit/core-extension";
import type { ThreadItem } from "@/types/thread-item";

/**
 * Fold an {@link AgentProgressEvent} stream into renderable {@link ThreadItem}
 * rows.
 *
 * The stream and the view model disagree in three ways, which is the whole
 * reason this exists:
 *
 * - Assistant text arrives as many `assistant-message` deltas plus one final
 *   message per text block. The UI wants a single growing row per block.
 * - A tool invocation is two events (`tool-call`, `tool-result`). The UI wants
 *   one row that fills in.
 * - Lifecycle events (`turn-started`, `session-updated`, …) render as nothing.
 *
 * Pure and total: called both to hydrate from `getHistory` and to apply live
 * events, so the same transcript must result either way.
 */

/** Rows plus the bookkeeping needed to keep folding events onto them. */
export interface ThreadState {
	items: ThreadItem[];
	/** Index of the assistant row currently being streamed into, if any. */
	streamingIndex?: number;
}

export const emptyThread = (): ThreadState => ({
	items: [],
});

const toolRowId = (turnId: string | undefined, toolName: string, at: number) =>
	`${turnId ?? "no-turn"}:${toolName}:${at}`;

/**
 * The rows with the one being streamed into, if any, marked finished. Every
 * event that ends a stream goes through this; a row left `streaming` keeps its
 * caret forever, since nothing else will close it.
 */
const closeStream = ({ items, streamingIndex }: ThreadState): ThreadItem[] => {
	if (streamingIndex === undefined) {
		return items;
	}
	const current = items[streamingIndex];
	if (current?.kind !== "assistant") {
		return items;
	}
	return items.with(streamingIndex, {
		...current,
		streaming: false,
	});
};

/**
 * Fold one event onto the thread, returning new state (or the same object when
 * the event renders as nothing, so React can skip the update).
 */
export const applyAgentEvent = (
	state: ThreadState,
	event: AgentProgressEvent,
): ThreadState => {
	switch (event.type) {
		case "user-message":
			return {
				items: [
					...closeStream(state),
					{
						kind: "user",
						id: `${event.turnId ?? event.sessionId}:user:${event.at}`,
						at: event.at,
						content: event.content,
					},
				],
				// A new user turn ends any previous stream.
				streamingIndex: undefined,
			};

		case "assistant-message": {
			// The block's final message repeats its whole text, so it replaces
			// rather than appends — otherwise every block renders twice over.
			if (event.done) {
				if (state.streamingIndex === undefined) {
					return {
						items: [
							...state.items,
							{
								kind: "assistant",
								id: `${event.turnId ?? event.sessionId}:assistant:${event.at}`,
								at: event.at,
								content: event.content,
								streaming: false,
							},
						],
					};
				}
				const items = [
					...state.items,
				];
				const current = items[state.streamingIndex];
				if (current?.kind === "assistant") {
					items[state.streamingIndex] = {
						...current,
						content: event.content,
						streaming: false,
					};
				}
				return {
					items,
				};
			}

			if (state.streamingIndex === undefined) {
				return {
					items: [
						...state.items,
						{
							kind: "assistant",
							id: `${event.turnId ?? event.sessionId}:assistant:${event.at}`,
							at: event.at,
							content: event.content,
							streaming: true,
						},
					],
					streamingIndex: state.items.length,
				};
			}
			const items = [
				...state.items,
			];
			const current = items[state.streamingIndex];
			if (current?.kind === "assistant") {
				items[state.streamingIndex] = {
					...current,
					content: current.content + event.content,
				};
			}
			return {
				items,
				streamingIndex: state.streamingIndex,
			};
		}

		case "tool-call":
			return {
				items: [
					...closeStream(state),
					{
						kind: "tool",
						id: toolRowId(event.turnId, event.toolName, event.at),
						at: event.at,
						toolName: event.toolName,
						args: event.args as unknown[],
					},
				],
				// A tool call interrupts the assistant's prose; anything after it is a
				// new message rather than a continuation of the previous row.
				streamingIndex: undefined,
			};

		case "tool-result": {
			// Events carry no call id, so a result is matched to the most recent
			// unresolved call of the same tool. Steps are sequential within a turn,
			// so the newest pending call is the right one.
			const index = state.items.findLastIndex(
				(item) =>
					item.kind === "tool" &&
					item.toolName === event.toolName &&
					item.ok === undefined,
			);
			if (index === -1) {
				return state;
			}
			const items = [
				...state.items,
			];
			const call = items[index];
			if (call.kind === "tool") {
				items[index] = {
					...call,
					ok: event.ok,
					result: event.result,
					reason: event.reason,
				};
			}
			return {
				...state,
				items,
			};
		}

		case "error":
			return {
				items: [
					...closeStream(state),
					{
						kind: "error",
						id: `${event.turnId ?? event.sessionId}:error:${event.at}`,
						at: event.at,
						message: event.message,
					},
				],
				streamingIndex: undefined,
			};

		case "aborted":
			return {
				items: [
					...closeStream(state),
					{
						kind: "aborted",
						id: `${event.turnId ?? event.sessionId}:aborted:${event.at}`,
						at: event.at,
					},
				],
				streamingIndex: undefined,
			};

		case "turn-completed": {
			// Close any row still marked streaming: `turn-completed` can arrive
			// without a final `assistant-message` when the turn ended on a tool call.
			if (state.streamingIndex === undefined) {
				return state;
			}
			return {
				items: closeStream(state),
			};
		}

		default:
			// Session lifecycle and turn-started render as nothing.
			return state;
	}
};

/** Fold a whole transcript, for hydrating from `getHistory`. */
export const buildThread = (
	events: readonly AgentProgressEvent[],
): ThreadState => events.reduce(applyAgentEvent, emptyThread());
