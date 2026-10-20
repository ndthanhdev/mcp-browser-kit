import browser, { type Runtime } from "webextension-polyfill";
import { AGENT_PORT_NAME } from "./runtime-port-transport";

type PortHandler = (port: Runtime.Port) => void;

/**
 * Catches agent UI connections from the moment the background evaluates.
 *
 * MV3 only delivers `onConnect` to listeners registered during the worker's
 * initial synchronous evaluation, and the connection that wakes the worker is
 * dispatched while composition is still awaiting. The gate registers
 * immediately, buffers ports until a handler attaches, then replays them.
 */
export class AgentPortGate {
	private readonly buffered: Runtime.Port[] = [];
	private handler?: PortHandler;
	private refused = false;

	constructor() {
		browser.runtime.onConnect.addListener(this.onConnect);
	}

	/** Ports waiting for a handler. */
	get bufferedCount(): number {
		return this.buffered.length;
	}

	/** Start handing ports to `handler`, replaying any that arrived early. */
	attach = (handler: PortHandler): void => {
		this.handler = handler;
		for (const port of this.buffered.splice(0)) {
			handler(port);
		}
	};

	/** Stop handing ports over; later connections are buffered again. */
	detach = (): void => {
		this.handler = undefined;
	};

	/**
	 * The agent will never start: close waiting ports so their calls fail
	 * instead of hanging, and close any that arrive later.
	 */
	refuse = (): void => {
		this.refused = true;
		this.handler = undefined;
		for (const port of this.buffered.splice(0)) {
			port.disconnect();
		}
	};

	private onConnect = (port: Runtime.Port): void => {
		if (port.name !== AGENT_PORT_NAME) {
			return;
		}
		if (this.refused) {
			port.disconnect();
			return;
		}
		if (this.handler) {
			this.handler(port);
			return;
		}
		this.buffered.push(port);
	};
}
