import {
	type AgentProgressEvent,
	BrowserAgentInputPort,
} from "@mcp-browser-kit/core-extension";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { MessageChannelRpcServer } from "@mcp-browser-kit/core-utils";
import { type Container, inject, injectable } from "inversify";
import type { Runtime } from "webextension-polyfill";
import type { AgentPortGate } from "./agent-port-gate";
import { RuntimePortTransport } from "./runtime-port-transport";

/**
 * The subset of {@link BrowserAgentInputPort} exposed over the wire.
 * `subscribe` takes a callback, which cannot cross a port; events are pushed
 * as `agentEvent` frames instead.
 */
export type AgentRpcProcedures = Pick<
	BrowserAgentInputPort,
	| "createSession"
	| "endSession"
	| "sendMessage"
	| "cancel"
	| "getSession"
	| "listSessions"
	| "getHistory"
>;

/**
 * Driving adapter that exposes {@link BrowserAgentInputPort} to extension UI
 * contexts over `browser.runtime` ports — the `AgentRpcController` in
 * `docs/architecture.md`.
 *
 * Each connected UI gets its own {@link RuntimePortTransport} and `subscribe`
 * registration, torn down on disconnect.
 */
@injectable()
export class ExtensionDrivingAgentRpc {
	static setupContainer(container: Container): void {
		container.bind<ExtensionDrivingAgentRpc>(ExtensionDrivingAgentRpc).toSelf();
	}

	private readonly logger;
	private readonly connections = new Set<RuntimePortTransport>();
	private stopListening?: () => void;

	constructor(
		@inject(BrowserAgentInputPort)
		private readonly agent: BrowserAgentInputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionDrivingAgentRpc");
	}

	/**
	 * Begin serving connections from UI contexts. Idempotent.
	 *
	 * Takes a gate rather than registering `onConnect` itself, because the
	 * connection that woke the worker arrives before async composition finishes.
	 */
	start = (gate: AgentPortGate): void => {
		if (this.stopListening) {
			return;
		}
		gate.attach(this.accept);
		this.stopListening = () => {
			gate.detach();
		};
		this.logger.verbose("serving agent UI connections");
	};

	/** Stop accepting connections and drop the existing ones. */
	stop = (): void => {
		this.stopListening?.();
		this.stopListening = undefined;
		for (const transport of this.connections) {
			transport.disconnect();
		}
		this.connections.clear();
	};

	private accept = (port: Runtime.Port): void => {
		const transport = new RuntimePortTransport(port);
		this.connections.add(transport);

		const procedures: AgentRpcProcedures = {
			createSession: this.agent.createSession,
			endSession: this.agent.endSession,
			sendMessage: this.agent.sendMessage,
			cancel: this.agent.cancel,
			getSession: this.agent.getSession,
			listSessions: this.agent.listSessions,
			getHistory: this.agent.getHistory,
		};

		// Serialised so calls on the shared session registry can't interleave.
		const rpcServer = new MessageChannelRpcServer<AgentRpcProcedures>(
			procedures,
			{
				dispatchMode: "queue",
			},
		);
		rpcServer.startListen(transport.asRpcServerChannel());

		const unsubscribe = this.agent.subscribe((event: AgentProgressEvent) => {
			transport.sendAgentEvent(event);
		});

		transport.onDisconnect(() => {
			unsubscribe();
			rpcServer.stopListen();
			this.connections.delete(transport);
			this.logger.verbose("agent UI disconnected");
		});

		this.logger.verbose("agent UI connected");
	};
}
