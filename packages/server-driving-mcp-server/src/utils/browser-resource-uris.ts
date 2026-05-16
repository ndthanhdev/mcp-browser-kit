/**
 * Pure helpers for the browser/tab resource URI surface exposed by the MCP
 * server. Keeping URI construction, parsing, title formatting and completion
 * ranking here means `browser-resources.ts` can focus on MCP wiring.
 *
 * URI scheme: `bk:///`
 *   - `bk:///b-<shortId>`                 — one browser
 *   - `bk:///b-<shortId>/t-<tabId>`       — one tab (hierarchically nested)
 *
 * The short browser ID is the nanoid portion of the channelId (everything
 * after the `channel:` prefix). This hides the internal `channel:` concept
 * from callers. The single ResourceTemplate `bk:///{+resourceId}` (reserved
 * expansion) matches both forms because the `+` operator allows slashes.
 */

import type {
	BrowserSnapshot,
	BrowserSnapshotTabInfo,
} from "@mcp-browser-kit/types";

export const BK_URI_PREFIX = "bk:///";
export const BK_TEMPLATE = "bk:///{+resourceId}";

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

/** `bk:///b-<shortId>` */
export const browserBkUri = (channelId: string): string =>
	`${BK_URI_PREFIX}b-${shortChannelId(channelId)}`;

/** `bk:///b-<shortId>/t-<tabId>` */
export const tabBkUri = (channelId: string, tabId: string): string =>
	`${BK_URI_PREFIX}b-${shortChannelId(channelId)}/t-${tabId}`;

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
	  };

/**
 * Resolves a `resourceId` value (the `{+resourceId}` variable extracted from
 * the template) back to structured coordinates.
 *
 * Formats accepted:
 *   `b-<shortId>`            → browser
 *   `b-<shortId>/t-<tabId>`  → tab
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
	if (!resourceId.startsWith("b-")) return undefined;

	const rest = resourceId.slice(2); // strip "b-"
	const slashT = rest.indexOf("/t-");

	const shortId = slashT >= 0 ? rest.slice(0, slashT) : rest;
	const tabId = slashT >= 0 ? rest.slice(slashT + 3) : undefined;

	if (!shortId) return undefined;
	if (tabId !== undefined && !tabId) return undefined;

	// Reverse-map short ID → full channelId.
	const channelId = listBrowsers().find(
		(b) => shortChannelId(b.channelId) === shortId,
	)?.channelId;

	if (!channelId) return undefined;

	return tabId === undefined
		? {
				type: "browser",
				channelId,
			}
		: {
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

export const formatBrowserDescription = (
	channelId: string,
	snapshot: BrowserSnapshot,
): string => {
	const tabCount = snapshot.tabs.length;
	const windowCount = snapshot.windows.length;
	return `${tabCount} tab${tabCount === 1 ? "" : "s"} · ${windowCount} window${
		windowCount === 1 ? "" : "s"
	} · ${shortChannelId(channelId)}`;
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

export const formatTabDescription = (
	tab: BrowserSnapshotTabInfo,
	snapshot: BrowserSnapshot,
): string => {
	const host = hostnameOf(tab.url);
	const browserName = snapshot.browserInfo?.browserName?.trim() || "browser";
	const base = `${host || tab.url} · ${browserName}`;
	return tab.active ? `${base} (active)` : base;
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
	const map = snapshot.activeTabIdByWindow;
	if (!map) return undefined;
	for (const [windowId, activeTabId] of Object.entries(map)) {
		if (activeTabId === tabId) return windowId;
	}
	return undefined;
};
