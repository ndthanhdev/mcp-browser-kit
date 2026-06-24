/**
 * Inbound side of the Browser Agent driving contract.
 *
 * These are the messages the `apps/agent-ui` SPA sends to the background
 * service worker over the `runtime.connect: mbk:agent` channel. The
 * `AgentRpcController` (driving adapter) deserializes them and invokes
 * {@link BrowserAgentInputPort}. They are deliberately transport-agnostic so
 * the core never depends on how the UI is wired.
 */

/** A single natural-language instruction that drives an agent turn. */
export interface AgentUserMessage {
	/** Free-form instruction for the agent to carry out. */
	content: string;
}

/**
 * Optional scope for a session. The extension always acts on its own browser,
 * so a target only narrows the window/tab the agent should operate on; when
 * omitted the agent decides from the current browser state. Set per session
 * (see {@link AgentCreateSessionParams}), not per message.
 */
export interface AgentTarget {
	windowId?: string;
	tabId?: string;
}

/** Parameters for {@link BrowserAgentInputPort.sendMessage}. */
export interface AgentSendMessageParams {
	/** Identifies the existing session the message drives a turn on. */
	sessionId: string;
	message: AgentUserMessage;
}
