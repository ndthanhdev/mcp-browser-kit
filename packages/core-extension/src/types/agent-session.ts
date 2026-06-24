import type { AgentTarget } from "./agent-message";

/**
 * First-class agent session.
 *
 * The Browser Agent is a single agent (one AI SDK v7 `HarnessAgent`, held as a
 * DI singleton); a *session* is one conversation thread on it. Each
 * {@link AgentSession} maps to a harness session that owns its own conversation
 * history. `sessionId` doubles as the harness resume key.
 */
export type AgentSessionStatus = "idle" | "running" | "error" | "ended";

export interface AgentSession {
	/** Stable id; also the underlying `HarnessAgent` session id (resume key). */
	sessionId: string;
	status: AgentSessionStatus;
	/** Optional window/tab scope the session operates on. */
	target?: AgentTarget;
	/** Optional human label, e.g. derived from the first user message. */
	title?: string;
	/** Epoch milliseconds the session was created. */
	createdAt: number;
	/** Epoch milliseconds the session last changed. */
	updatedAt: number;
}

/** Parameters for {@link BrowserAgentInputPort.createSession}. */
export interface AgentCreateSessionParams {
	target?: AgentTarget;
	title?: string;
}
