import { injectable } from "inversify";
import type { McpDescriptionsInputPort } from "../input-ports";

@injectable()
export class McpDescriptionsUseCases implements McpDescriptionsInputPort {
	serverInstructions = (): string => {
		return [
			"MCP Browser Kit observes and controls connected browsers via an extension.",
			"",
			"Quick start:",
			"1. resources/read -> bk:///context",
			"2. Find target tab in browsers[].tabs[] by matching url or title",
			"3. Copy tabKey, tabUri, and extensionInfo.manifestVersion verbatim — never construct keys",
			"4. resources/read -> {tabUri}/readable-elements",
			"5. If hasNextPage, read bk:///snapshot-types/readable-elements/snapshots/{snapshotId}/pages/{nextPageNumber}",
			"6. Filter data tuples [path, role, text] by role and text; use path (e.g. 0.2.1) as readablePath",
			"7. Call tool; always check structuredContent.ok — if false, re-read elements or showHumanHint",
			"",
			"Context shape (bk:///context):",
			'{ "browsers": [{ "extensionInfo": { "manifestVersion": 3 }, "tabs": [{ "tabKey": "ext::win::tab", "tabUri": "bk:///browsers/.../tabs/...", "windowKey": "ext::win", "url": "...", "title": "..." }] }] }',
			"",
			"Tool selection by manifestVersion:",
			"- MV2: all tools; prefer element tools; invokeJsFn only as last resort",
			"- MV3: clickOnElement, fillTextToElement, hitEnterOnElement, openTab, closeTab, getSelection, showHumanHint",
			"- MV3 blocked: captureTab, invokeJsFn; avoid coordinate tools (no screenshot source for x/y)",
			"",
			"Error recovery:",
			"- Tab not found -> re-read bk:///context",
			"- Element not found at path / no longer exists -> re-read readable-elements, pick fresh path",
			"- Page N out of range / No cached snapshot -> read page 1 first, use snapshotId from that response",
			"- captureTab/invokeJsFn not supported -> switch to element tools",
			"",
			"Constraints:",
			"- tabKey and windowKey are opaque — source from bk:///context only",
			"- readablePath is a dot-separated tree index (0.2.1), not a CSS selector",
			"- Snapshots go stale after navigation; re-read after page changes",
			"- Resource lists capped at 200 tabs; subscribe for resources/updated notifications",
		].join("\n");
	};

	captureTabInstruction = (): string => {
		return [
			"Screenshot a tab.",
			"When: MV2 tabs only; you need pixel coordinates for coordinate tools.",
			"How: tabKey from bk:///context browsers[].tabs[].tabKey; use returned dimensions to compute x/y.",
			"Requires: tabKey.",
			"Returns: value { data (base64 image), width, height, mimeType } — use width/height to scale coordinates.",
			"Avoid: calling on manifestVersion 3 — use readable-elements instead.",
		].join("\n");
	};

	clickOnViewableElementInstruction = (): string => {
		return [
			"Click at pixel coordinates inside a tab.",
			"When: MV2 fallback when no readablePath is available.",
			"How: x/y from a recent captureTab screenshot (same width/height); tabKey from context.",
			"Requires: tabKey, x, y.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3 (no screenshot source); prefer clickOnElement when readablePath exists.",
		].join("\n");
	};

	fillTextToViewableElementInstruction = (): string => {
		return [
			"Click at (x, y) then type text into the focused input.",
			"When: MV2 fallback for inputs without a readablePath.",
			"How: coordinates from recent captureTab; submit via clickOnCoordinates on submit button or hitEnterOnCoordinates.",
			"Requires: tabKey, x, y, value.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3; prefer fillTextToElement when readablePath is available.",
		].join("\n");
	};

	hitEnterOnViewableElementInstruction = (): string => {
		return [
			"Click at (x, y) then press Enter to submit a form.",
			"When: MV2 fallback to submit when no submit button readablePath exists.",
			"How: coordinates from recent captureTab.",
			"Requires: tabKey, x, y.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3; prefer hitEnterOnElement when readablePath is available.",
		].join("\n");
	};

	clickOnReadableElementInstruction = (): string => {
		return [
			"Click an element by readablePath.",
			"When: primary click method on MV2 and MV3.",
			"How: read {tabUri}/readable-elements; filter [path, role, text] tuples by role and text; copy path exactly (e.g. 0.2.1) — not a CSS selector.",
			"Requires: tabKey, readablePath.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: inventing paths; re-read elements after navigation if click fails.",
		].join("\n");
	};

	fillTextToReadableElementInstruction = (): string => {
		return [
			"Type text into an input, textarea, or editable element by readablePath.",
			"When: primary fill method on MV2 and MV3.",
			"How: readablePath from first element of [path, role, text] tuple in readable-elements; submit via clickOnElement on submit button or hitEnterOnElement.",
			"Requires: tabKey, readablePath, value.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: CSS selectors as readablePath; stale paths after DOM changes.",
		].join("\n");
	};

	hitEnterOnReadableElementInstruction = (): string => {
		return [
			"Focus an element by readablePath then press Enter.",
			"When: submitting a form when no explicit submit button exists.",
			"How: readablePath from readable-elements tuple (dot-separated index like 0.2.1).",
			"Requires: tabKey, readablePath.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: using when a submit button readablePath is available — click it instead.",
		].join("\n");
	};

	invokeJsFnInstruction = (): string => {
		return [
			"Execute a JavaScript function body in the page context.",
			"When: MV2 only, and only when element/coordinate tools cannot accomplish the task.",
			"How: fnBodyCode is the function body only (no function wrapper); use return to send a value back. Example: return document.title;",
			"Requires: tabKey, fnBodyCode.",
			"Returns: value.result = whatever you return (must be JSON-serializable).",
			"Avoid: on manifestVersion 3; wrapping in function () { ... }.",
		].join("\n");
	};

	closeTabInstruction = (): string => {
		return [
			"Close a tab. Irreversible.",
			"When: finished with a tab and no further interaction needed.",
			"How: tabKey from bk:///context browsers[].tabs[].tabKey.",
			"Requires: tabKey.",
			"Returns: ok=true once closed.",
			"Avoid: closing the tab you still need for further interactions.",
		].join("\n");
	};

	getSelectionInstruction = (): string => {
		return [
			"Get the user's current text selection in a tab.",
			"When: you need text the user has highlighted on the page.",
			"How: tabKey from bk:///context.",
			"Requires: tabKey.",
			"Returns: value.selectedText — empty string when nothing is selected.",
			"Avoid: expecting content when nothing is selected.",
		].join("\n");
	};

	openTabInstruction = (): string => {
		return [
			"Open a URL in a new tab.",
			"When: navigating to a page not already open.",
			"How: windowKey from bk:///context; url must include scheme (https://); after success re-read context for the new tabKey and wait for page load.",
			"Requires: windowKey, url.",
			"Returns: value { tabKey, windowKey } — use the returned tabKey for follow-up calls.",
			"Avoid: interacting immediately — tab needs a moment to load.",
		].join("\n");
	};

	showHumanHintInstruction = (): string => {
		return [
			"Highlight an element and instruct the human to act when automation fails or the step is human-only.",
			"When: CAPTCHA, 2FA, irreversible confirmations, or repeated tool failures.",
			"How: provide exactly one target — readablePath (preferred) OR x and y, not both; fill action requires value.",
			"Requires: tabKey, action (click | fill | hit-enter), message.",
			"Returns: humanMessage (relay verbatim to the user) and expiresInSeconds.",
			"Avoid: both readablePath and coordinates.",
		].join("\n");
	};

	contextResourceDescription = (): string => {
		return [
			"Aggregated state of every connected browser — read this first.",
			"tabKey, tabUri, and windowKey are on each entry in browsers[].tabs[], not at browser root.",
			"extensionInfo.manifestVersion on each browser gates available tools (2 = all, 3 = element tools only).",
			"Example pointer: browsers[0].tabs[0].tabUri -> append /readable-elements to interact.",
		].join(" ");
	};

	bkResourceTemplateDescription = (): string => {
		return [
			"Per-browser and per-tab resources under bk:///{+resourceId}:",
			"bk:///browsers/<shortId> — full browser snapshot",
			"bk:///browsers/<shortId>/tabs/<tabId> — tab metadata with tabKey",
			"bk:///browsers/<shortId>/tabs/<tabId>/readable-text — readable text snapshot (page 1 only)",
			"bk:///browsers/<shortId>/tabs/<tabId>/readable-elements — readable elements snapshot (page 1 only)",
			"bk:///snapshot-types/<type>/snapshots/<snapshotId>/pages/<N> — page 2+ for both readable-text and readable-elements (use snapshotId from page 1)",
		].join("\n");
	};

	browserResourceDescription = (
		tabCount: number,
		windowCount: number,
		shortId: string,
	): string => {
		return `${tabCount} tab${tabCount === 1 ? "" : "s"} · ${windowCount} window${windowCount === 1 ? "" : "s"} · ${shortId}`;
	};

	tabResourceDescription = (
		url: string,
		browserName: string,
		active: boolean,
	): string => {
		const host = this.hostnameOf(url);
		const base = `${host || url} · ${browserName}`;
		return active ? `${base} (active)` : base;
	};

	tabReadableTextDescription = (tabId: string): string => {
		return [
			`Snapshot inner text for tab ${tabId}.`,
			"Returns JSON with snapshotId, data (text), hasNextPage, nextPageNumber, totalPages.",
			"Page 2+: bk:///snapshot-types/readable-text/snapshots/<snapshotId>/pages/<nextPageNumber> — tab URIs do not support /pages/N.",
		].join(" ");
	};

	tabReadableElementsDescription = (tabId: string): string => {
		return [
			`Snapshot interactive elements for tab ${tabId}.`,
			"Returns JSON with snapshotId, data ([path, role, text] tuples), hasNextPage, nextPageNumber, totalPages.",
			"path is a dot-separated tree index (e.g. 0.2.1) — use as readablePath, not a CSS selector.",
			"Page 2+: bk:///snapshot-types/readable-elements/snapshots/<snapshotId>/pages/<nextPageNumber>.",
		].join(" ");
	};

	private hostnameOf(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}
}
