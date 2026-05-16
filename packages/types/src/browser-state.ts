/**
 * Shared envelope for observable browser state.
 *
 * A single event type — `browserStateChanged` — carries a full snapshot of one
 * browser's observable state. Consumers apply last-write-wins per `browserId`.
 *
 * Concrete domain types (`BrowserInfo`, `ExtensionInfo`, `ExtensionWindowInfo`,
 * `ExtensionTabInfo`) currently live in `@mcp-browser-kit/core-extension/types`
 * and are referenced structurally here to keep `@mcp-browser-kit/types` free of
 * cross-package runtime imports.
 */

export interface BrowserSnapshotBrowserInfo {
	browserName: string;
	browserVersion: string;
}

export interface BrowserSnapshotExtensionInfo {
	extensionId: string;
	manifestVersion: number;
	extensionVersion: string;
}

export interface BrowserSnapshotWindowInfo {
	id: string;
	focused: boolean;
}

export interface BrowserSnapshotTabInfo {
	id: string;
	active: boolean;
	title: string;
	url: string;
}

export type BrowserSnapshotStatus = "online" | "offline";

export interface BrowserSnapshot {
	status: BrowserSnapshotStatus;
	browserInfo: BrowserSnapshotBrowserInfo;
	extensionInfo: BrowserSnapshotExtensionInfo;
	windows: BrowserSnapshotWindowInfo[];
	tabs: BrowserSnapshotTabInfo[];
	/** windowId -> active tabId */
	activeTabIdByWindow: Record<string, string>;
	/** tabId -> last content mutation timestamp (ms epoch) */
	contentChangedAt: Record<string, number>;
	/** ms epoch of last known online time. Filled server-side on disconnect. */
	offlineAt?: number;
}

export interface BrowserStateChangedEvent {
	type: "browserStateChanged";
	/** ms epoch timestamp the extension emitted the snapshot */
	at: number;
	snapshot: BrowserSnapshot;
}

export type BrowserEvent = BrowserStateChangedEvent;
