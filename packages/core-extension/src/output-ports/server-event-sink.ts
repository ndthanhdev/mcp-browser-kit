import type { BrowserEvent } from "@mcp-browser-kit/types";

/**
 * Driven side: publish an event to every active server channel.
 * Implementations should fan out to all currently-connected sinks; failures
 * per sink should be logged and swallowed — the use case guarantees the next
 * state change will trigger a republish, so dropped events are self-healing.
 *
 * Retain-and-replay (optional but recommended): implementations MAY retain the
 * most recent event emitted via `publish` and replay it to any channel that
 * connects afterwards during the same lifecycle. The replay MUST happen
 * exactly once per new channel and MUST NOT prevent subsequent `publish`
 * calls from overwriting the retained event. Retained state is cleared when
 * the sink is disposed. This mirrors MQTT "retained message" semantics and,
 * because snapshot events are idempotent and last-event-wins, it is the
 * natural fix for the startup race where the initial flush fires before any
 * server channel has finished handshaking.
 */
export interface ServerEventSinkOutputPort {
	publish: (event: BrowserEvent) => Promise<void>;
}

export const ServerEventSinkOutputPort = Symbol("ServerEventSinkOutputPort");
