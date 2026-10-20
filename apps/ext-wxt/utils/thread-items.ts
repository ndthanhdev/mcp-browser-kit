import type { AgentProgressEvent } from "@mcp-browser-kit/core-extension";
import type { ThreadItem } from "@/types/thread-item";

/**
 * Fold an {@link AgentProgressEvent} stream into renderable {@link ThreadItem}
 * rows: one growing row per assistant text block, one row per tool call and
 * result, nothing for lifecycle events.
 *
 * Must stay pure: hydrating from `getHistory` and applying live events must
 * yield the same transcript.
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

/** The rows with the one being streamed into, if any, marked finished. */
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
				streamingIndex: undefined,
			};

		case "assistant-message": {
			// The block's final message repeats its whole text, so it replaces
			// rather than appends.
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
				streamingIndex: undefined,
			};

		case "tool-result": {
			// Events carry no call id; steps are sequential within a turn, so match
			// the newest unresolved call of the same tool.
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
			// The turn can end on a tool call, without a final `assistant-message`.
			if (state.streamingIndex === undefined) {
				return state;
			}
			return {
				items: closeStream(state),
			};
		}

		default:
			return state;
	}
};

/** Fold a whole transcript, for hydrating from `getHistory`. */
export const buildThread = (
	events: readonly AgentProgressEvent[],
): ThreadState => events.reduce(applyAgentEvent, emptyThread());
