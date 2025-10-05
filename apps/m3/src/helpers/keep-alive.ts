import browser, { type Runtime } from "webextension-polyfill";

export interface KeepAliveMessage {
	action: "keepAlive";
}

export interface KeepAliveResponse {
	action: "keepAliveAck";
}

export const startKeepAlive = () => {
	const keepAlive = async () => {
		const response = await browser.runtime.sendMessage<
			KeepAliveMessage,
			KeepAliveResponse
		>({
			action: "keepAlive",
		});
		if (response?.action !== "keepAliveAck") {
			throw new Error("Keep alive failed");
		}
	};

	keepAlive();

	const id = setInterval(keepAlive, 25_000);

	const stop = () => {
		clearInterval(id);
	};

	return stop;
};

export const startListenKeepAlive = () => {
	const keepAliveHandler = (
		message: unknown,
		sender: Runtime.MessageSender,
		sendResponse: (response?: KeepAliveResponse) => void,
	) => {
		const msg = message as KeepAliveMessage;
		if (msg.action === "keepAlive") {
			sendResponse({
				action: "keepAliveAck",
			});
		}

		return true as true;
	};

	browser.runtime.onMessage.addListener(keepAliveHandler);

	return () => {
		browser.runtime.onMessage.removeListener(keepAliveHandler);
	};
};
