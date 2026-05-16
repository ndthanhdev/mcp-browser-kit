/**
 * Contract for a subsystem that participates in the server lifecycle.
 *
 * Participants are started in registration order and stopped in reverse.
 * Both `start` and `stop` may be sync or async; orchestrators always await.
 */
export interface LifecycleParticipantOutputPort {
	/** Human-readable identifier used for logging. */
	readonly name: string;
	start(): void | Promise<void>;
	stop(): void | Promise<void>;
}

export const LifecycleParticipantOutputPort = Symbol(
	"LifecycleParticipantOutputPort",
);
