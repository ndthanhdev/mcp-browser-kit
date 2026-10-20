import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports/logger-factory";
import { inject, injectable } from "inversify";
import browser, { type Runtime } from "webextension-polyfill";

export interface KeepAliveMessage {
	action: "keepAlive";
}

export interface KeepAliveResponse {
	action: "keepAliveAck";
}

/** Just under Chrome's ~30s idle eviction window. */
const KEEP_ALIVE_INTERVAL_MS = 25_000;

/**
 * Holds an MV3 service worker awake by pinging it from a content script.
 *
 * Only worth doing when the background owns something that must outlive its
 * idle timeout — in this repo, the tRPC channel to the local MCP server. An app
 * whose background is driven by a `runtime.connect` port (the sidepanel agent in
 * `apps/ext-wxt`) does not need it: the port already keeps the worker alive for
 * exactly as long as it matters, and pinging from every frame of every tab would
 * defeat eviction permanently for no gain.
 */
@injectable()
export class KeepAlive {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;
	private intervalId?: ReturnType<typeof setInterval>;
	private keepAliveHandler?: (
		message: unknown,
		sender: Runtime.MessageSender,
		sendResponse: (response?: KeepAliveResponse) => void,
	) => true;
	/** Suppresses repeat logging while a failure persists. */
	private failing = false;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("KeepAlive");
	}

	/**
	 * Start pinging the background from this frame.
	 *
	 * @param intervalMs override the ping cadence. Exists so tests can exercise
	 *   several ticks in real time; fake timers can't be used here because
	 *   detecting a stray unhandled rejection needs a real macrotask boundary.
	 * @returns a function that stops the pings.
	 */
	startSending(intervalMs: number = KEEP_ALIVE_INTERVAL_MS): () => void {
		this.logger.info("Starting keep-alive sender");

		// Never rejects. It is invoked un-awaited below and from setInterval, so a
		// rejection has nowhere to go but the console as an unhandled rejection —
		// which is what it used to do on every tick once a ping started failing.
		const keepAlive = async (): Promise<void> => {
			try {
				const response = await browser.runtime.sendMessage<
					KeepAliveMessage,
					KeepAliveResponse
				>({
					action: "keepAlive",
				});
				if (response?.action !== "keepAliveAck") {
					this.reportFailure("unexpected response from the background");
					return;
				}
				if (this.failing) {
					this.logger.info("Keep-alive recovered");
					this.failing = false;
				}
			} catch (error) {
				// "Could not establish connection. Receiving end does not exist."
				// means the background registered no listener at all, which is a
				// permanent condition — so say it once rather than every 25 seconds.
				this.reportFailure(
					error instanceof Error ? error.message : String(error),
				);
			}
		};

		void keepAlive();
		this.intervalId = setInterval(() => {
			void keepAlive();
		}, intervalMs);

		return () => {
			this.logger.info("Stopping keep-alive sender");
			if (this.intervalId) {
				clearInterval(this.intervalId);
				this.intervalId = undefined;
			}
		};
	}

	/** Log the first failure of a run, then stay quiet until it recovers. */
	private reportFailure(reason: string): void {
		if (this.failing) {
			return;
		}
		this.failing = true;
		this.logger.warn(
			`Keep-alive ping failed and will keep retrying quietly: ${reason}`,
		);
	}

	/**
	 * Answer keep-alive pings. Must be called by the background, or every sender
	 * fails.
	 *
	 * @returns a function that stops listening.
	 */
	startListening(): () => void {
		this.logger.info("Starting keep-alive listener");

		this.keepAliveHandler = (
			message: unknown,
			_sender: Runtime.MessageSender,
			sendResponse: (response?: KeepAliveResponse) => void,
		): true => {
			const msg = message as KeepAliveMessage;
			if (msg?.action === "keepAlive") {
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
