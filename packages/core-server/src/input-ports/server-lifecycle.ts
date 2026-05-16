/**
 * Orchestrates start/stop across all registered `LifecycleParticipantOutputPort`
 * implementations. Idempotent. On start failure, rolls back any already-started
 * participants in reverse order.
 */
export interface ServerLifecycleInputPort {
	start(): Promise<void>;
	stop(): Promise<void>;
}

export const ServerLifecycleInputPort = Symbol("ServerLifecycleInputPort");
