import type { BrowserStateEntry } from "../core/browser-state-registry";

export interface ObserveBrowserStateInputPort {
	listBrowsers: () => BrowserStateEntry[];
	getBrowser: (channelId: string) => BrowserStateEntry | undefined;
	/**
	 * Subscribe to state changes. Returns an unsubscribe function.
	 *
	 * The listener receives the `channelId` of the channel that changed.
	 * Call `getBrowser(channelId)` to read the current state; it returns
	 * `undefined` when the channel has been evicted (no longer tracked).
	 *
	 * Listeners are invoked synchronously after each mutation. Exceptions
	 * thrown by a listener are caught and logged; other listeners still fire.
	 * Subscriptions are cleared on lifecycle `stop()`.
	 */
	onChange: (listener: (channelId: string) => void) => () => void;
}

export const ObserveBrowserStateInputPort = Symbol(
	"ObserveBrowserStateInputPort",
);
