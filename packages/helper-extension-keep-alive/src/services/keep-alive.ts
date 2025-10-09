import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { inject, injectable } from "inversify";
import browser, { type Runtime } from "webextension-polyfill";

export interface KeepAliveMessage {
	action: "keepAlive";
}

export interface KeepAliveResponse {
	action: "keepAliveAck";
}

@injectable()
export class KeepAlive {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;
	private intervalId?: NodeJS.Timeout;
	private keepAliveHandler?: (
		message: unknown,
		sender: Runtime.MessageSender,
		sendResponse: (response?: KeepAliveResponse) => void,
	) => true;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("KeepAlive");
	}

	/**
	 * Start sending keep-alive messages to the background script
	 * @returns A function to stop the keep-alive mechanism
	 */
	startSending(): () => void {
		this.logger.info("Starting keep-alive sender");

		const keepAlive = async () => {
			try {
				const response = await browser.runtime.sendMessage<
					KeepAliveMessage,
					KeepAliveResponse
				>({
					action: "keepAlive",
				});
				if (response?.action !== "keepAliveAck") {
					this.logger.error("Keep alive failed: invalid response");
					throw new Error("Keep alive failed");
				}
			} catch (error) {
				this.logger.error("Keep alive error:", error);
				throw error;
			}
		};

		// Send first keep-alive immediately
		keepAlive();

		this.intervalId = setInterval(keepAlive, 25_000);

		return () => {
			this.logger.info("Stopping keep-alive sender");
			if (this.intervalId) {
				clearInterval(this.intervalId);
				this.intervalId = undefined;
			}
		};
	}

	/**
	 * Start listening for keep-alive messages
	 * @returns A function to stop listening
	 */
	startListening(): () => void {
		this.logger.info("Starting keep-alive listener");

		this.keepAliveHandler = (
			message: unknown,
			_sender: Runtime.MessageSender,
			sendResponse: (response?: KeepAliveResponse) => void,
		): true => {
			const msg = message as KeepAliveMessage;
			if (msg.action === "keepAlive") {
				this.logger.info("Received keep-alive message, sending ack");
				sendResponse({
					action: "keepAliveAck",
				});
			}

			return true;
		};

		browser.runtime.onMessage.addListener(this.keepAliveHandler);

		return () => {
			this.logger.info("Stopping keep-alive listener");
			if (this.keepAliveHandler) {
				browser.runtime.onMessage.removeListener(this.keepAliveHandler);
				this.keepAliveHandler = undefined;
			}
		};
	}
}
