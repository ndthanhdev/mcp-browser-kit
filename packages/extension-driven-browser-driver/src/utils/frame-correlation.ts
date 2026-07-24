/**
 * Cross-origin-safe frame correlation: `postMessage` can always be sent to
 * an `<iframe>`'s `contentWindow` regardless of origin. The parent frame
 * (`TabDomTools.resolveHitTarget`) posts a nonce directly to the specific
 * `<iframe>` element that was hit; that frame's own content script
 * (`FrameCorrelationResponder`) receives it and reports the nonce back to
 * the background via a runtime message, which carries `sender.frameId` for
 * free — telling the background exactly which frameId that DOM element is,
 * with no ambiguity between sibling iframes and no WebExtension API needed
 * (none exists for this).
 */
export const CORRELATE_MESSAGE_TYPE = "mbk.frame.correlate";
export const CORRELATED_MESSAGE_KIND = "mbk.frame.correlated";

export interface CorrelateWindowMessage {
	type: typeof CORRELATE_MESSAGE_TYPE;
	nonce: string;
}

export interface CorrelatedRuntimeMessage {
	kind: typeof CORRELATED_MESSAGE_KIND;
	nonce: string;
}

export const isCorrelatedRuntimeMessage = (
	value: unknown,
): value is CorrelatedRuntimeMessage =>
	typeof value === "object" &&
	value !== null &&
	(value as CorrelatedRuntimeMessage).kind === CORRELATED_MESSAGE_KIND &&
	typeof (value as CorrelatedRuntimeMessage).nonce === "string";
