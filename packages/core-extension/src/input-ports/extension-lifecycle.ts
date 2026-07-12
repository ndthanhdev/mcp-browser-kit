export interface ExtensionLifecycleInputPort {
	/**
	 * Start the extension: link the tab RPC transport, begin server discovery,
	 * and start the downstream use cases (browser-state publishing, and future
	 * use cases such as the browser agent).
	 */
	start(): Promise<void>;
}

export const ExtensionLifecycleInputPort = Symbol(
	"ExtensionLifecycleInputPort",
);
