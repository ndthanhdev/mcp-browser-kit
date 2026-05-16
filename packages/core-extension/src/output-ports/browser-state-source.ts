import type { BrowserSnapshot } from "@mcp-browser-kit/types";

/**
 * Driven side: the adapter wires browser-platform listeners (tabs.onUpdated,
 * windows.onCreated, content-script mutation pings, ...) and exposes them as a
 * stream of snapshot "hints" — partial updates that the use case merges into
 * the authoritative snapshot.
 *
 * Hints are intentionally fire-and-forget: the use case owns the final
 * snapshot assembly and publish cadence.
 */
export type BrowserStateHint =
	| {
			kind: "initial";
	  }
	| {
			kind: "windows";
			windows: BrowserSnapshot["windows"];
	  }
	| {
			kind: "tabs";
			tabs: BrowserSnapshot["tabs"];
			activeTabIdByWindow: BrowserSnapshot["activeTabIdByWindow"];
	  }
	| {
			kind: "tabContentChanged";
			tabId: string;
			at: number;
	  };

export interface BrowserStateSourceOutputPort {
	/** Begin listening. Safe to call once. */
	start: () => Promise<void>;
	/** Stop listening and release platform-level resources. */
	stop: () => Promise<void>;
	/** Subscribe to incoming hints. Returns an unsubscribe function. */
	onHint: (listener: (hint: BrowserStateHint) => void) => () => void;
}

export const BrowserStateSourceOutputPort = Symbol(
	"BrowserStateSourceOutputPort",
);
