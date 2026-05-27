/**
 * Pure helpers for the browser/tab resource URI surface exposed by the MCP
 * server. Keeping URI construction, parsing, title formatting and completion
 * ranking here means `browser-resources.ts` can focus on MCP wiring.
 *
 * URI scheme: `bk:///`
 *   - `bk:///context`                                                        — aggregated context (static)
 *   - `bk:///browsers/<shortId>`                                            — one browser
 *   - `bk:///browsers/<shortId>/tabs/<tabId>`                               — one tab
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-text`                 — tab text (page 1)
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements`             — tab elements (page 1)
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-text/pages/<N>`       — tab text page N
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements/pages/<N>`   — tab elements page N
 *
 * The short browser ID is the nanoid portion of the channelId (everything
 * after the `channel:` prefix). The single ResourceTemplate
 * `bk:///{+resourceId}` (reserved expansion) matches all forms because the
 * `+` operator allows slashes.
 */

import type {
	BrowserSnapshot,
	BrowserSnapshotTabInfo,
} from "@mcp-browser-kit/types";

export const BK_URI_PREFIX = "bk:///";
export const BK_TEMPLATE = "bk:///{+resourceId}";
export const CONTEXT_URI = "bk:///context";

// ─── Short ID ────────────────────────────────────────────────────────────────

/**
 * Strips the `channel:` prefix from a channelId, returning only the nanoid
 * portion (8 chars). Falls back to the raw value if the prefix is absent.
 */
export const shortChannelId = (channelId: string): string => {
	const colon = channelId.indexOf(":");
	return colon >= 0 ? channelId.slice(colon + 1) : channelId;
};

// ─── URI constructors ─────────────────────────────────────────────────────────

/** `bk:///browsers/<shortId>` */
export const browserBkUri = (channelId: string): string =>
	`${BK_URI_PREFIX}browsers/${shortChannelId(channelId)}`;

/** `bk:///browsers/<shortId>/tabs/<tabId>` */
export const tabBkUri = (channelId: string, tabId: string): string =>
	`${BK_URI_PREFIX}browsers/${shortChannelId(channelId)}/tabs/${tabId}`;

/** `bk:///browsers/<shortId>/tabs/<tabId>/readable-text` */
export const tabReadableTextBkUri = (
	channelId: string,
	tabId: string,
): string =>
	`${BK_URI_PREFIX}browsers/${shortChannelId(channelId)}/tabs/${tabId}/readable-text`;

/** `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements` */
export const tabReadableElementsBkUri = (
	channelId: string,
	tabId: string,
): string =>
	`${BK_URI_PREFIX}browsers/${shortChannelId(channelId)}/tabs/${tabId}/readable-elements`;

/** `bk:///snapshot-types/<type>/snapshots/<snapshotId>/pages/<page>` */
export const snapshotPageBkUri = (
	type: "readable-text" | "readable-elements",
	snapshotId: string,
	page: number,
): string =>
	`${BK_URI_PREFIX}snapshot-types/${type}/snapshots/${snapshotId}/pages/${page}`;

// ─── Parser ───────────────────────────────────────────────────────────────────

export type ParsedBkResource =
	| {
			type: "browser";
			channelId: string;
	  }
	| {
			type: "tab";
			channelId: string;
			tabId: string;
	  }
	| {
			type: "tab-readable-text";
			channelId: string;
			tabId: string;
	  }
	| {
			type: "tab-readable-elements";
			channelId: string;
			tabId: string;
	  }
	| {
			type: "snapshot-page";
			contentType: "readable-text" | "readable-elements";
			snapshotId: string;
			pageNumber: number;
	  };

/**
 * Resolves a `resourceId` value (the `{+resourceId}` variable extracted from
 * the template) back to structured coordinates.
 *
 * Formats accepted:
 *   `browsers/<shortId>`                        → browser
 *   `browsers/<shortId>/tabs/<tabId>`           → tab
 *   `browsers/<shortId>/tabs/<tabId>/readable-text`
 *   `browsers/<shortId>/tabs/<tabId>/readable-elements`
 *   `snapshot-types/<type>/snapshots/<snapshotId>/pages/<pageNumber>`
 *
 * The short ID is reverse-mapped to a full channelId by scanning the live
 * browser list. Returns `undefined` for malformed input or an unknown short ID.
 */
export const parseBkResourceId = (
	resourceId: string,
	listBrowsers: () => ReadonlyArray<{
		channelId: string;
	}>,
): ParsedBkResource | undefined => {
	if (resourceId.startsWith("snapshot-types/")) {
		const match = resourceId.match(
			/^snapshot-types\/(readable-text|readable-elements)\/snapshots\/([^/]+)\/pages\/(\d+)$/,
		);
		if (match) {
			const contentType = match[1] as "readable-text" | "readable-elements";
			const snapshotId = match[2];
			const pageNumber = Number(match[3]);
			if (pageNumber >= 1) {
				return {
					type: "snapshot-page",
					contentType,
					snapshotId,
					pageNumber,
				};
			}
		}
		return;
	}

	if (!resourceId.startsWith("browsers/")) return;

	const rest = resourceId.slice("browsers/".length);
	const slashTabs = rest.indexOf("/tabs/");

	const shortId = slashTabs >= 0 ? rest.slice(0, slashTabs) : rest;

	if (!shortId) return;

	// Reverse-map short ID → full channelId.
	const channelId = listBrowsers().find(
		(b) => shortChannelId(b.channelId) === shortId,
	)?.channelId;

	if (!channelId) return;

	if (slashTabs < 0) {
		return {
			type: "browser",
			channelId,
		};
	}

	// Everything after "/tabs/"
	const tabRemainder = rest.slice(slashTabs + "/tabs/".length);
	const slashSuffix = tabRemainder.indexOf("/");

	const tabId =
		slashSuffix >= 0 ? tabRemainder.slice(0, slashSuffix) : tabRemainder;
	const suffix =
		slashSuffix >= 0 ? tabRemainder.slice(slashSuffix + 1) : undefined;

	if (suffix !== undefined) {
		if (suffix === "readable-text") {
			return {
				type: "tab-readable-text",
				channelId,
				tabId,
			};
		}
		if (suffix === "readable-elements") {
			return {
				type: "tab-readable-elements",
				channelId,
				tabId,
			};
		}
		return;
	}

	return {
		type: "tab",
		channelId,
		tabId,
	};
};

// ─── Display formatters ───────────────────────────────────────────────────────

/**
 * Human-readable title for a browser entry, suitable for `@`-mention pickers.
 * Falls back gracefully when optional fields are missing.
 */
export const formatBrowserTitle = (snapshot: BrowserSnapshot): string => {
	const name = snapshot.browserInfo?.browserName?.trim();
	const version = snapshot.browserInfo?.browserVersion?.trim();
	const base =
		[
			name,
			version,
		]
			.filter(Boolean)
			.join(" ") || "Browser";
	return snapshot.status === "offline" ? `${base} (offline)` : base;
};

const hostnameOf = (url: string): string => {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
};

export const formatTabTitle = (tab: BrowserSnapshotTabInfo): string => {
	const title = tab.title?.trim();
	if (title) return title;
	const host = hostnameOf(tab.url);
	return host || tab.url || tab.id;
};

// ─── Completion helpers ───────────────────────────────────────────────────────

/**
 * Lower score ⇒ better match. Returns Number.POSITIVE_INFINITY for no-match.
 * Ranking: exact prefix (0) < substring in primary (1) < substring in secondary (2).
 */
export const rankByQuery = (
	query: string,
	primary: string,
	secondary?: string,
): number => {
	const q = query.trim().toLowerCase();
	if (q.length === 0) return 1; // any candidate is a valid suggestion
	const p = primary.toLowerCase();
	if (p.startsWith(q)) return 0;
	if (p.includes(q)) return 1;
	if (secondary) {
		const s = secondary.toLowerCase();
		if (s.startsWith(q)) return 1.5;
		if (s.includes(q)) return 2;
	}
	return Number.POSITIVE_INFINITY;
};

/**
 * Picks a single string value from a ResourceTemplate variable slot, which
 * may be `string | string[] | undefined`. Returns `undefined` for empty or
 * missing values.
 */
export const pickVariable = (
	raw: string | string[] | undefined,
): string | undefined => {
	const v = Array.isArray(raw) ? raw[0] : raw;
	return typeof v === "string" && v.length > 0 ? v : undefined;
};

/**
 * Reverse-lookup the windowId a given tabId is active in, using the
 * snapshot's `activeTabIdByWindow` map. Returns `undefined` if the tab is
 * not currently the active tab in any window.
 */
export const findWindowIdForTab = (
	snapshot: BrowserSnapshot,
	tabId: string,
): string | undefined => {
	if (snapshot.tabs) {
		const tab = snapshot.tabs.find((t) => t.id === tabId);
		if (tab?.windowId) return tab.windowId;
	}
	const map = snapshot.activeTabIdByWindow;
	if (!map) return;
	for (const [windowId, activeTabId] of Object.entries(map)) {
		if (activeTabId === tabId) return windowId;
	}
	return;
};
