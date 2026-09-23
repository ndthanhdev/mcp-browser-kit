/**
 * Outcome of a page-modifying tool call, measured after the page settled.
 * `diff` covers readable elements (see `diffReadableElements`) and is omitted
 * when nothing changed, when the tab navigated, or when it exceeds the size
 * budget (`tooLarge`) — in those cases the caller should re-read the snapshot.
 */
export interface PageChange {
	/** Whether the readable elements differ from before the action. */
	changed: boolean;
	/** Whether the action replaced the document (full or route navigation). */
	navigated: boolean;
	/** Tab URL after the action settled. */
	url: string;
	/** Number of readable elements added. */
	added: number;
	/** Number of readable elements removed. */
	removed: number;
	/** The diff was too large to include; re-read readable-elements instead. */
	tooLarge: boolean;
	/** Paths of elements outside the diff shifted; older paths may be stale. */
	pathsShifted: boolean;
	/** Unified-style diff: "+" added, "-" removed, "  " unchanged context. */
	diff?: string;
	/**
	 * Set by the server when the browser extension predates page-change
	 * results: the action ran, but what it changed is unknown.
	 */
	detailsUnavailable?: boolean;
}

export interface LoadTabContextOptions {
	/**
	 * Store the snapshot as the tab's path map so later readablePath lookups
	 * resolve against it. Defaults to true.
	 */
	commit?: boolean;
	/** Play the scan animation. Defaults to true. */
	animate?: boolean;
}

export interface TabSettledState {
	url: string;
	/** Random id minted per document load; changes when the document is replaced. */
	documentId: string;
}
