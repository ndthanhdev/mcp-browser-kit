import browser from "webextension-polyfill";
import {
	CORRELATE_MESSAGE_TYPE,
	CORRELATED_MESSAGE_KIND,
	type CorrelateWindowMessage,
} from "../utils/frame-correlation";

/**
 * Content-script helper: every frame runs one of these. When a parent frame
 * posts a correlation nonce directly to this frame's `window` (see
 * `TabDomTools.resolveHitTarget`), immediately reports it to the background
 * via a runtime message — `sender.frameId` on that message tells the
 * background which frameId this frame is, with no ambiguity.
 */
export class FrameCorrelationResponder {
	private handleWindowMessage = (event: MessageEvent): void => {
		const data = event.data as Partial<CorrelateWindowMessage> | null;
		if (data?.type !== CORRELATE_MESSAGE_TYPE || !data.nonce) {
			return;
		}
		try {
			browser.runtime
				.sendMessage({
					kind: CORRELATED_MESSAGE_KIND,
					nonce: data.nonce,
				})
				.catch(() => {
					// Background may be asleep/unreachable; the click will just
					// fall back to the outer element.
				});
		} catch {
			// sendMessage can throw synchronously if the extension context is gone.
		}
	};

	start = (): void => {
		if (typeof window === "undefined") {
			return;
		}
		window.addEventListener("message", this.handleWindowMessage);
	};

	stop = (): void => {
		if (typeof window === "undefined") {
			return;
		}
		window.removeEventListener("message", this.handleWindowMessage);
	};
}
