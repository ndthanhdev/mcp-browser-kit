import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import browser, { type Runtime } from "webextension-polyfill";
import { isCorrelatedRuntimeMessage } from "../utils/frame-correlation";

/**
 * Background-side half of the frame correlation handshake. Listens for
 * `mbk.frame.correlated` runtime messages (sent by `FrameCorrelationResponder`
 * in whichever frame received the correlation `postMessage`) and resolves
 * whoever is waiting on that nonce with the reporting frame's id, taken
 * straight from `sender.frameId` — no WebExtension API answers "which
 * frameId is this specific DOM element" directly, so this is the mechanism.
 */
@injectable()
export class FrameCorrelationService {
	private readonly logger;
	private readonly pending = new Map<string, (frameId: string) => void>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("FrameCorrelationService");
		browser.runtime.onMessage.addListener(this.handleMessage);
	}

	private handleMessage = (
		message: unknown,
		sender: Runtime.MessageSender,
	): void => {
		if (!isCorrelatedRuntimeMessage(message) || sender.frameId == null) {
			return;
		}
		const resolve = this.pending.get(message.nonce);
		if (resolve) {
			resolve(String(sender.frameId));
			this.pending.delete(message.nonce);
		}
	};

	/** Resolves with the frameId that reported this nonce, or null on timeout. */
	waitForCorrelation = (
		nonce: string,
		timeoutMs: number,
	): Promise<string | null> => {
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(nonce);
				this.logger.verbose(`Correlation timed out for nonce: ${nonce}`);
				resolve(null);
			}, timeoutMs);
			this.pending.set(nonce, (frameId) => {
				clearTimeout(timer);
				resolve(frameId);
			});
		});
	};
}
