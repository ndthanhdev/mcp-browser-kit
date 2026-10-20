import type { Runtime } from "webextension-polyfill";

/**
 * In-memory stand-in for `webextension-polyfill`. Like the real one,
 * `sendMessage` rejects with "Receiving end does not exist" when no listener is
 * registered.
 */

type Listener = (
	message: unknown,
	sender: Runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => true | undefined;

const listeners = new Set<Listener>();

/** Every message passed to `sendMessage`, for assertions. */
export const sentMessages: unknown[] = [];

export const resetRuntimeStub = (): void => {
	listeners.clear();
	sentMessages.length = 0;
};

const browser = {
	runtime: {
		sendMessage: async (message: unknown): Promise<unknown> => {
			sentMessages.push(message);
			if (listeners.size === 0) {
				throw new Error(
					"Could not establish connection. Receiving end does not exist.",
				);
			}
			let response: unknown;
			for (const listener of listeners) {
				listener(message, {} as Runtime.MessageSender, (value) => {
					response = value;
				});
			}
			return response;
		},
		onMessage: {
			addListener: (listener: Listener) => {
				listeners.add(listener);
			},
			removeListener: (listener: Listener) => {
				listeners.delete(listener);
			},
			hasListener: (listener: Listener) => listeners.has(listener),
		},
	},
};

export default browser;
