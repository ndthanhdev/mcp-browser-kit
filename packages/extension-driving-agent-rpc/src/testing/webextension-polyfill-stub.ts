import type { Runtime } from "webextension-polyfill";

/**
 * In-memory stand-in for `webextension-polyfill`, aliased in by
 * `vitest.config.ts`. The real polyfill throws on import outside an extension.
 *
 * Only `runtime.connect` / `runtime.onConnect` are implemented — the surface
 * this package uses. Tests install a connect handler with
 * {@link setConnectHandler} to decide what port a `connect()` call yields, which
 * is how service-worker eviction is simulated.
 */

type ConnectHandler = (info: { name?: string }) => Runtime.Port;

let connectHandler: ConnectHandler = () => {
	throw new Error(
		"No connect handler installed. Call setConnectHandler first.",
	);
};

const onConnectListeners = new Set<(port: Runtime.Port) => void>();

/** Decide what `browser.runtime.connect()` returns. */
export const setConnectHandler = (handler: ConnectHandler): void => {
	connectHandler = handler;
};

/** How many times `browser.runtime.connect()` has been called. */
export let connectCount = 0;

/** Reset the stub between tests. */
export const resetRuntimeStub = (): void => {
	connectCount = 0;
	onConnectListeners.clear();
	connectHandler = () => {
		throw new Error(
			"No connect handler installed. Call setConnectHandler first.",
		);
	};
};

/** Deliver a port to whatever registered `runtime.onConnect`. */
export const fireOnConnect = (port: Runtime.Port): void => {
	for (const listener of [
		...onConnectListeners,
	]) {
		listener(port);
	}
};

const browser = {
	runtime: {
		connect: (info: { name?: string } = {}) => {
			connectCount += 1;
			return connectHandler(info);
		},
		onConnect: {
			addListener: (listener: (port: Runtime.Port) => void) => {
				onConnectListeners.add(listener);
			},
			removeListener: (listener: (port: Runtime.Port) => void) => {
				onConnectListeners.delete(listener);
			},
			hasListener: (listener: (port: Runtime.Port) => void) =>
				onConnectListeners.has(listener),
		},
	},
};

export default browser;
