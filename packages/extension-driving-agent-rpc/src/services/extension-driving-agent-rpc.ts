import {
	type AgentProgressEvent,
	BrowserAgentInputPort,
} from "@mcp-browser-kit/core-extension";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { MessageChannelRpcServer } from "@mcp-browser-kit/core-utils";
import { type Container, inject, injectable } from "inversify";
import browser from "webextension-polyfill";
import {
	AGENT_PORT_NAME,
	RuntimePortTransport,
} from "./runtime-port-transport";

/**
 * The subset of {@link BrowserAgentInputPort} exposed over the wire.
 *
 * `subscribe` is deliberately absent: it takes a callback, which cannot cross a
 * port. Progress events are pushed as `agentEvent` frames instead, and the
 * client re-exposes a local `subscribe` over those.
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
 * contexts — the `AgentRpcController` in `docs/architecture.md`.
 *
 * The agent lives in the background service worker because that is the only
 * context that survives tab navigation and owns the browser driver. The
 * sidepanel is a separate document, so it reaches the agent over
 * `browser.runtime` port messaging: RPC for the imperative calls, pushed
 * `agentEvent` frames for the stream.
 *
 * Every connected UI gets its own {@link RuntimePortTransport} and its own
 * `subscribe` registration, torn down on disconnect. That matters under MV3:
 * the sidepanel is closed and reopened constantly, and a leaked listener per
 * open would fan every event out N times.
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

	/** Begin accepting connections from UI contexts. Idempotent. */
	start = (): void => {
		if (this.stopListening) {
			return;
		}
		const onConnect = (port: browser.Runtime.Port) => {
			if (port.name !== AGENT_PORT_NAME) {
				return;
			}
			this.accept(port);
		};
		browser.runtime.onConnect.addListener(onConnect);
		this.stopListening = () => {
			browser.runtime.onConnect.removeListener(onConnect);
		};
		this.logger.verbose("listening for agent UI connections");
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

	private accept(port: browser.Runtime.Port): void {
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

		// "queue", not "parallel": the agent mutates a shared session registry, and
		// a `sendMessage` racing an `endSession` for the same session would
		// interleave. The UI issues few enough calls that serialising is free.
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
	}
}
