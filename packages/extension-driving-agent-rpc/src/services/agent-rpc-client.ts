import type {
	AgentCreateSessionParams,
	AgentProgressEvent,
	AgentSendMessageParams,
	AgentSession,
} from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcClient } from "@mcp-browser-kit/core-utils";
import browser from "webextension-polyfill";
import type { AgentRpcProcedures } from "./extension-driving-agent-rpc";
import {
	AGENT_PORT_NAME,
	RuntimePortTransport,
} from "./runtime-port-transport";

/** Detach a listener registered with {@link AgentRpcClient.subscribe}. */
export type AgentUnsubscribe = () => void;

/**
 * UI-side handle on the background's agent.
 *
 * Mirrors {@link import("@mcp-browser-kit/core-extension").BrowserAgentInputPort}.
 * The port drops when MV3 evicts the idle worker, losing every session; the
 * next call reconnects and {@link onReconnect} fires so the UI can re-hydrate.
 */
export class AgentRpcClient {
	private transport?: RuntimePortTransport;
	private rpc?: MessageChannelRpcClient<AgentRpcProcedures>;
	private readonly listeners = new Set<(event: AgentProgressEvent) => void>();
	private readonly reconnectListeners = new Set<() => void>();
	/** False until the first connect, so the initial connect isn't a "reconnect". */
	private hasConnected = false;

	/** Subscribe to progress events across all sessions. */
	subscribe = (
		listener: (event: AgentProgressEvent) => void,
	): AgentUnsubscribe => {
		this.listeners.add(listener);
		this.ensureConnected();
		return () => {
			this.listeners.delete(listener);
		};
	};

	/**
	 * Fires after the port has been re-established following a drop. The UI must
	 * re-hydrate: the background may have been restarted, losing every session.
	 */
	onReconnect = (listener: () => void): AgentUnsubscribe => {
		this.reconnectListeners.add(listener);
		return () => {
			this.reconnectListeners.delete(listener);
		};
	};

	/** Close the port. The next call transparently reopens it. */
	disconnect = (): void => {
		this.transport?.disconnect();
		this.transport = undefined;
		this.rpc = undefined;
	};

	// --- Agent surface ---

	createSession = (params?: AgentCreateSessionParams): Promise<AgentSession> =>
		this.call(
			"createSession",
			params === undefined
				? []
				: [
						params,
					],
		);

	endSession = (sessionId: string): Promise<void> =>
		this.call("endSession", [
			sessionId,
		]);

	sendMessage = (params: AgentSendMessageParams): Promise<void> =>
		this.call("sendMessage", [
			params,
		]);

	cancel = (sessionId: string): Promise<void> =>
		this.call("cancel", [
			sessionId,
		]);

	getSession = (sessionId: string): Promise<AgentSession | undefined> =>
		this.call("getSession", [
			sessionId,
		]);

	listSessions = (): Promise<AgentSession[]> => this.call("listSessions", []);

	getHistory = (sessionId: string): Promise<AgentProgressEvent[]> =>
		this.call("getHistory", [
			sessionId,
		]);

	// --- Transport ---

	private call<TResult>(method: string, args: unknown[]): Promise<TResult> {
		const rpc = this.ensureConnected();
		// The typed surface is declared above; call by name here.
		return (
			rpc as unknown as {
				call: (request: {
					method: string;
					args: unknown[];
					extraArgs: object;
				}) => Promise<TResult>;
			}
		).call({
			method,
			args,
			extraArgs: {},
		});
	}

	private ensureConnected(): MessageChannelRpcClient<AgentRpcProcedures> {
		if (this.rpc && this.transport && !this.transport.isDisconnected) {
			return this.rpc;
		}

		const port = browser.runtime.connect({
			name: AGENT_PORT_NAME,
		});
		const transport = new RuntimePortTransport(port);
		const rpc = new MessageChannelRpcClient<AgentRpcProcedures>();
		rpc.bindChannel(transport.asRpcClientChannel());

		transport.onAgentEvent((event) => {
			for (const listener of this.listeners) {
				listener(event);
			}
		});

		transport.onDisconnect(() => {
			// A dead port never delivers their `resolve` frames.
			rpc.rejectPending(
				new Error(
					"The extension background disconnected before answering. It may have been restarted.",
				),
			);

			// Reconnect lazily on the next call; an eager reconnect would revive
			// an evicted worker.
			if (this.transport === transport) {
				this.transport = undefined;
				this.rpc = undefined;
			}
		});

		this.transport = transport;
		this.rpc = rpc;

		if (this.hasConnected) {
			for (const listener of this.reconnectListeners) {
				listener();
			}
		}
		this.hasConnected = true;

		return rpc;
	}
}
