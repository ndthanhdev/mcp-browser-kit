import type { Runtime } from "webextension-polyfill";

/**
 * A pair of in-memory `browser.runtime.Port`s wired to each other. Messages are
 * delivered synchronously.
 */
export interface FakePortPair {
	background: Runtime.Port;
	ui: Runtime.Port;
	/** Simulate the service worker being evicted / the UI closing. */
	disconnect: () => void;
	/** Raw frames the background posted, for asserting on the wire format. */
	postedToUi: unknown[];
	/** Raw frames the UI posted. */
	postedToBackground: unknown[];
}

type Listener<T extends unknown[]> = (...args: T) => void;

const listenerSet = <T extends unknown[]>() => {
	const listeners = new Set<Listener<T>>();
	return {
		api: {
			addListener: (listener: Listener<T>) => {
				listeners.add(listener);
			},
			removeListener: (listener: Listener<T>) => {
				listeners.delete(listener);
			},
			hasListener: (listener: Listener<T>) => listeners.has(listener),
		},
		fire: (...args: T) => {
			for (const listener of [
				...listeners,
			]) {
				listener(...args);
			}
		},
		clear: () => {
			listeners.clear();
		},
	};
};

export const createFakePortPair = (name = "mbk:agent"): FakePortPair => {
	const postedToUi: unknown[] = [];
	const postedToBackground: unknown[] = [];

	const uiMessages =
		listenerSet<
			[
				unknown,
			]
		>();
	const backgroundMessages =
		listenerSet<
			[
				unknown,
			]
		>();
	const uiDisconnects = listenerSet<[]>();
	const backgroundDisconnects = listenerSet<[]>();

	let connected = true;

	const disconnect = () => {
		if (!connected) {
			return;
		}
		connected = false;
		uiDisconnects.fire();
		backgroundDisconnects.fire();
		uiMessages.clear();
		backgroundMessages.clear();
	};

	const background = {
		name,
		postMessage: (message: unknown) => {
			if (!connected) {
				throw new Error("Attempting to use a disconnected port object");
			}
			postedToUi.push(message);
			uiMessages.fire(message);
		},
		onMessage: backgroundMessages.api,
		onDisconnect: backgroundDisconnects.api,
		disconnect,
	} as unknown as Runtime.Port;

	const ui = {
		name,
		postMessage: (message: unknown) => {
			if (!connected) {
				throw new Error("Attempting to use a disconnected port object");
			}
			postedToBackground.push(message);
			backgroundMessages.fire(message);
		},
		onMessage: uiMessages.api,
		onDisconnect: uiDisconnects.api,
		disconnect,
	} as unknown as Runtime.Port;

	return {
		background,
		ui,
		disconnect,
		postedToUi,
		postedToBackground,
	};
};
