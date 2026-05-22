import type { ReadableElementRecord } from "@mcp-browser-kit/core-extension";
import type { PaginatedResult } from "../types";

export interface PaginatedContentInputPort {
	/**
	 * Fetches readable text for a tab, splits it into pages, caches the result,
	 * and returns the requested page. When `pageNumber` is omitted or 1, the
	 * full content is re-fetched from the extension. For pageNumber >= 2 the
	 * response is served from cache (throws if no cached entry exists).
	 */
	getReadableTextPage(
		channelId: string,
		tabId: string,
		pageNumber?: number,
	): Promise<PaginatedResult<string>>;

	/**
	 * Same as `getReadableTextPage` but for the interactive element list.
	 */
	getReadableElementsPage(
		channelId: string,
		tabId: string,
		pageNumber?: number,
	): Promise<PaginatedResult<ReadableElementRecord[]>>;

	/**
	 * Evicts cached pages. When `tabId` is provided only entries for that tab
	 * are removed; otherwise all entries for the browser channel are cleared.
	 */
	invalidateCache(channelId: string, tabId?: string): void;
}

export const PaginatedContentInputPort = Symbol("PaginatedContentInputPort");
