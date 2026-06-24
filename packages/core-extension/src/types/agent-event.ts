import type { AgentSession } from "./agent-session";
import type { ExtensionToolName } from "./extension-tools";

/**
 * Outbound side of the Browser Agent driving contract.
 *
 * While {@link BrowserAgentInputPort} works through a session it emits a stream
 * of {@link AgentProgressEvent}s. The `AgentRpcController` forwards them back to
 * the `apps/agent-ui` SPA as "progress events" over the `mbk:agent` channel.
 * The core remains transport-agnostic: it only knows it has subscribers.
 *
 * The union is also the replayable transcript: `getHistory` returns the durable
 * subset of these events (lifecycle, user/assistant messages, tool activity),
 * excluding transient `assistant-message` deltas.
 */

export interface AgentEventBase {
	/** Conversation this event belongs to (see {@link AgentSession}). */
	sessionId: string;
	/**
	 * Monotonic id for the single agent turn this event belongs to. Omitted for
	 * pure session-lifecycle events that occur outside any turn.
	 */
	turnId?: string;
	/** Epoch milliseconds when the event was produced. */
	at: number;
}

/**
 * A discriminated union of everything the agent reports. Session-lifecycle
 * members let the UI track sessions reactively without re-reading
 * `listSessions`. Tool activity reuses {@link ExtensionToolName} so the UI can
 * render the same tool vocabulary the extension already exposes; the
 * `tool-result` shape mirrors the server tool envelope (`ok`/`result`/`reason`).
 */
export type AgentProgressEvent =
	| (AgentEventBase & {
			type: "session-created";
			session: AgentSession;
	  })
	| (AgentEventBase & {
			type: "session-updated";
			session: AgentSession;
	  })
	| (AgentEventBase & {
			type: "session-ended";
	  })
	| (AgentEventBase & {
			type: "user-message";
			content: string;
	  })
	| (AgentEventBase & {
			type: "turn-started";
	  })
	| (AgentEventBase & {
			type: "assistant-message";
			content: string;
			/**
			 * `false`/absent for an incremental `text-delta`; `true` on the final
			 * coalesced message for the turn (the durable transcript entry).
			 */
			done?: boolean;
	  })
	| (AgentEventBase & {
			type: "tool-call";
			toolName: ExtensionToolName;
			args: unknown[];
	  })
	| (AgentEventBase & {
			type: "tool-result";
			toolName: ExtensionToolName;
			ok: boolean;
			result?: unknown;
			reason?: string;
	  })
	| (AgentEventBase & {
			type: "turn-completed";
			summary?: string;
	  })
	| (AgentEventBase & {
			type: "aborted";
	  })
	| (AgentEventBase & {
			type: "error";
			message: string;
	  });

export type AgentEventType = AgentProgressEvent["type"];
