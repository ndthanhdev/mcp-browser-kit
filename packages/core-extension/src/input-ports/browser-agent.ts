import type {
	AgentCreateSessionParams,
	AgentProgressEvent,
	AgentSendMessageParams,
	AgentSession,
} from "../types";

/** Listener invoked for every {@link AgentProgressEvent} the agent emits. */
export type AgentEventListener = (event: AgentProgressEvent) => void;

/** Returned by {@link BrowserAgentInputPort.subscribe} to detach a listener. */
export type AgentUnsubscribe = () => void;

/**
 * Driving contract for the Browser Agent (the `BrowserAgentUseCases` node in
 * `docs/architecture.md`). The `AgentRpcController` driving adapter is the only
 * caller: it translates `mbk:agent` channel messages into these methods and
 * forwards every {@link AgentProgressEvent} from `subscribe` back to the
 * `apps/agent-ui` SPA.
 *
 * This is a *single* agent that owns *many* sessions. The implementation (a
 * later, non-driving pass) wraps one AI SDK v7 `HarnessAgent` held as a DI
 * singleton — "construct the agent once; it holds configuration, not a live
 * session". Each method maps onto the harness:
 *
 * - `createSession`  → `await agent.createSession({ resumeFrom? })`
 * - `sendMessage`    → `agent.stream({ session, prompt })`, parts → events
 * - `cancel`         → `session.stop()` (session stays usable)
 * - `endSession`     → `session.destroy()`
 * - `getHistory`     → the harness session's native conversation history
 * - persistence seam → `session.detach()` → resume state + `createSession({ resumeFrom })`
 *
 * It reasons via the planned `LlmProviderOutputPort` (realized by the harness/
 * model adapter) and acts via the existing `ExtensionToolCallInputPort` →
 * `BrowserDriverOutputPort`. Those collaborators are out of scope here — this
 * file fixes only the boundary the driving layer depends on.
 */
export interface BrowserAgentInputPort {
	// --- Session lifecycle ---

	/**
	 * Open a new conversation session on the agent. Emits a `session-created`
	 * event and returns the created {@link AgentSession}.
	 */
	createSession(params?: AgentCreateSessionParams): Promise<AgentSession>;

	/**
	 * Close a session: cancel any in-flight turn and discard it. Idempotent.
	 * Emits a `session-ended` event.
	 */
	endSession(sessionId: string): Promise<void>;

	// --- Drive ---

	/**
	 * Drive an agent turn from a user instruction on an existing session.
	 * Resolves once the turn has been *accepted and started* — NOT when it
	 * completes. Progress and the final outcome are reported asynchronously via
	 * {@link subscribe}.
	 */
	sendMessage(params: AgentSendMessageParams): Promise<void>;

	/**
	 * Cancel the in-flight turn for a session, if any. Idempotent: cancelling a
	 * session with no active turn is a no-op. The session stays usable (returns
	 * to `idle`); a cancelled turn emits an `aborted` event.
	 */
	cancel(sessionId: string): Promise<void>;

	// --- Reads (for UI hydration) ---

	/** Snapshot of a single session, or `undefined` if unknown. */
	getSession(sessionId: string): Promise<AgentSession | undefined>;

	/** Snapshot of all known sessions. */
	listSessions(): Promise<AgentSession[]>;

	/**
	 * Durable transcript for a session: the replayable subset of
	 * {@link AgentProgressEvent}s (lifecycle, user/assistant messages, tool
	 * activity), excluding transient `assistant-message` deltas. Lets a reopened
	 * UI hydrate without replaying the live stream.
	 */
	getHistory(sessionId: string): Promise<AgentProgressEvent[]>;

	// --- Stream ---

	/**
	 * Subscribe to progress events across all sessions. The driving adapter
	 * filters by `sessionId` when fanning out to UI connections. Returns an
	 * unsubscribe function.
	 */
	subscribe(listener: AgentEventListener): AgentUnsubscribe;
}

export const BrowserAgentInputPort = Symbol.for("BrowserAgentInputPort");
