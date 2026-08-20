import type { AgentProgressEvent } from "@mcp-browser-kit/core-extension";
import type {
	DeferData,
	MessageChannelForRpcClient,
	MessageChannelForRpcServer,
	ResolveData,
} from "@mcp-browser-kit/core-utils";
import { EmitteryMessageChannel } from "@mcp-browser-kit/core-utils";
import Emittery from "emittery";
import type { Runtime } from "webextension-polyfill";

/** Name the sidepanel connects under; the background matches on it. */
export const AGENT_PORT_NAME = "mbk:agent";

/** Progress events pushed from background to UI, outside the request/response flow. */
interface AgentEventData {
	agentEvent: AgentProgressEvent;
}

/**
 * Adapts a `browser.runtime.Port` to the `MessageChannel` shape the
 * `MessageChannelRpcServer`/`Client` in `core-utils` expect.
 *
 * The port carries two kinds of traffic multiplexed by message key: RPC
 * `defer`/`resolve` frames, and unsolicited `agentEvent` pushes. They share one
 * port rather than opening two, because MV3 uses port disconnection to detect a
 * dead peer — two ports means two lifecycles to keep in sync for no benefit.
 *
 * Both directions are Emittery-backed, matching `EmitteryMessageChannel`
 * elsewhere in the monorepo. Inbound port messages are re-emitted on `incoming`;
 * anything emitted on `outgoing` is forwarded to `port.postMessage`. Nothing is
 * buffered, so a frame emitted after disconnect is dropped — the right
 * behaviour for a UI that has gone away.
 */
export class RuntimePortTransport {
	/** Wire frames arriving from the peer, keyed by frame type. */
	private readonly incoming = new Emittery<
		DeferData & ResolveData & AgentEventData
	>();
	/** Frames this side wants to send; forwarded to the port below. */
	private readonly outgoing = new Emittery<
		DeferData & ResolveData & AgentEventData
	>();
	private disconnected = false;

	constructor(private readonly port: Runtime.Port) {
		port.onMessage.addListener((message) => {
			const record = (message ?? {}) as Record<string, unknown>;
			// One key per frame — `{ defer }`, `{ resolve }` or `{ agentEvent }`.
			for (const [key, payload] of Object.entries(record)) {
				void this.incoming.emit(
					key as keyof (DeferData & ResolveData & AgentEventData),
					payload as never,
				);
			}
		});

		port.onDisconnect.addListener(() => {
			this.disconnected = true;
			this.incoming.clearListeners();
			this.outgoing.clearListeners();
		});

		this.outgoing.onAny((key, payload) => {
			this.post(key as string, payload);
		});
	}

	/** Whether the peer has gone away — the port is unusable after this. */
	get isDisconnected(): boolean {
		return this.disconnected;
	}

	private post = (key: string, payload: unknown): void => {
		if (this.disconnected) {
			return;
		}
		try {
			this.port.postMessage({
				[key]: payload,
			});
		} catch {
			// The peer disconnected between the check and the post. Nothing useful
			// to do: RPC callers never resolve (the UI unmounts anyway) and event
			// pushes are fire-and-forget.
			this.disconnected = true;
		}
	};

	/** Channel view for the background's `MessageChannelRpcServer`. */
	asRpcServerChannel = (): MessageChannelForRpcServer =>
		new EmitteryMessageChannel<DeferData, ResolveData>(
			this.incoming as unknown as EmitteryMessageChannel<
				DeferData,
				ResolveData
			>["incoming"],
			this.outgoing as unknown as EmitteryMessageChannel<
				DeferData,
				ResolveData
			>["outgoing"],
		);

	/** Channel view for the UI's `MessageChannelRpcClient`. */
	asRpcClientChannel = (): MessageChannelForRpcClient =>
		new EmitteryMessageChannel<ResolveData, DeferData>(
			this.incoming as unknown as EmitteryMessageChannel<
				ResolveData,
				DeferData
			>["incoming"],
			this.outgoing as unknown as EmitteryMessageChannel<
				ResolveData,
				DeferData
			>["outgoing"],
		);

	/** Push a progress event to the peer. */
	sendAgentEvent = (event: AgentProgressEvent): void => {
		void this.outgoing.emit("agentEvent", event);
	};

	/** Listen for pushed progress events. Returns an unsubscribe. */
	onAgentEvent = (
		listener: (event: AgentProgressEvent) => void,
	): (() => void) => this.incoming.on("agentEvent", listener);

	/** Listen for the peer going away. */
	onDisconnect = (listener: () => void): void => {
		this.port.onDisconnect.addListener(listener);
	};

	/** Tear the port down from this side. */
	disconnect = (): void => {
		this.disconnected = true;
		this.port.disconnect();
	};
}
