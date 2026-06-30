import { injectable } from "inversify";
import type { McpDescriptionsInputPort } from "../input-ports";

@injectable()
export class McpDescriptionsUseCases implements McpDescriptionsInputPort {
	serverInstructions = (): string => {
		return [
			"MCP Browser Kit observes and controls connected browsers via an extension.",
			"",
			"Quick start (resources):",
			"1. resources/read -> bk:///context",
			"2. Find target tab in browsers[].tabs[] by matching url or title",
			"3. Read its ids: browserId (browsers[].browserId), windowId and tabId (browsers[].tabs[].windowId / .id); copy tabUri and extensionInfo.manifestVersion verbatim",
			"4. resources/read -> {tabUri}/readable-elements",
			"5. If hasNextPage, read bk:///snapshot-types/readable-elements/snapshots/{snapshotId}/pages/{nextPageNumber}",
			'6. Filter data tuples [path, role, text, value?] by role and text; use path (e.g. 0.2.1) as readablePath. value is appended only when the element has a current form value (text inputs/textarea/select) or is a checked checkbox/radio ("checked").',
			"7. Call tool with { browserId, windowId, tabId, ... }; always check structuredContent.ok — if false, re-read elements or showHumanHint",
			"",
			"Quick start (tools — for clients without resource support):",
			"1. getContext (no params) — same data as bk:///context",
			"2. getReadableElements({ browserId, tabId }) — same data as {tabUri}/readable-elements",
			"3. If hasNextPage, getSnapshotPage({ snapshotId, type, pageNumber })",
			"4. Use readablePath from the elements in interaction tools",
			"",
			"Context shape (bk:///context or getContext):",
			'{ "browsers": [{ "browserId": "<short-id>", "extensionInfo": { "manifestVersion": 3 }, "tabs": [{ "id": "<tabId>", "windowId": "<windowId>", "tabUri": "bk:///browsers/.../tabs/...", "url": "...", "title": "..." }] }] }',
			"",
			"Tool selection by manifestVersion:",
			"- MV2: all tools; prefer element tools; invokeJsFn only as last resort",
			"- MV3: clickOnElement, fillTextToElement, hitEnterOnElement, scrollPage, scrollElement, openTab, closeTab, getSelection, showHumanHint",
			"- MV3 blocked: captureTab, invokeJsFn; avoid coordinate tools (no screenshot source for x/y)",
			"",
			"Error recovery:",
			"- Tab not found -> re-read bk:///context or call getContext",
			"- Element not found at path / no longer exists -> re-read readable-elements or call getReadableElements, pick fresh path",
			"- Page N out of range / No cached snapshot -> read page 1 first, use snapshotId from that response",
			"- captureTab/invokeJsFn not supported -> switch to element tools",
			"",
			"Complex inputs:",
			"- Custom dropdown/combobox/listbox (ARIA, React/MUI): clickOnElement the trigger -> re-read readable-elements (options now present) -> clickOnElement the option with matching text. Re-read after opening; snapshots go stale.",
			"- Custom datepicker popup: clickOnElement the field to open the calendar -> re-read elements -> click prev/next month then the day cell.",
			"- Native <input> date/time/color pickers: fillTextToElement with the exact value format (see fillTextToElement).",
			"- Native <select>, by shape, verifying via re-read after each step. Listbox (multiple or size>1) shows options inline: clickOnElement the option, else MV2 invokeJsFn (set option.selected or .value/.selectedIndex, dispatch a bubbling change). Single-line dropdown (size=1) has a native popup that ignores synthetic clicks: MV2 invokeJsFn (set .value/.selectedIndex, dispatch change); MV3 best-effort clickOnElement select then option, then showHumanHint if unchanged.",
			"- Range slider: try fillTextToElement with the numeric value (subject to min/max/step); if it clamps or fails, MV2 -> invokeJsFn (set .value, dispatch input + change), MV3 -> showHumanHint.",
			'- Checkbox/radio: clickOnElement toggles it. Checked state appears as the optional 4th tuple value "checked" (absent when unchecked), so check the tuple and avoid re-clicking a box already in the desired state.',
			"- File input (<input type=file>): cannot be set by tools (browser security). Use showHumanHint with the fill action to ask the user to pick the file.",
			"",
			"Constraints:",
			"- browserId, windowId, tabId — source from bk:///context or getContext (browsers[].browserId and browsers[].tabs[].windowId / .id); do not invent them",
			"- readablePath is a dot-separated tree index (0.2.1), not a CSS selector",
			"- Snapshots go stale after navigation; re-read after page changes",
			"- ok=true means a change was detected (focus/aria/DOM mutation), not proof the intended state was reached — re-read elements or text to confirm critical results",
			"- Resource lists capped at 200 tabs; subscribe for resources/updated notifications",
		].join("\n");
	};

	captureTabInstruction = (): string => {
		return [
			"Screenshot a tab.",
			"When: MV2 tabs only; you need pixel coordinates for coordinate tools.",
			"How: browserId, windowId, tabId from bk:///context; use returned dimensions to compute x/y.",
			"Requires: browserId, windowId, tabId.",
			"Returns: value { data (base64 image), width, height, mimeType } — use width/height to scale coordinates.",
			"Avoid: calling on manifestVersion 3 — use readable-elements instead.",
		].join("\n");
	};

	clickOnViewableElementInstruction = (): string => {
		return [
			"Click at pixel coordinates inside a tab.",
			"When: MV2 fallback when no readablePath is available.",
			"How: x/y from a recent captureTab screenshot (same width/height); browserId, windowId, tabId from context.",
			"Requires: browserId, windowId, tabId, x, y.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3 (no screenshot source); prefer clickOnElement when readablePath exists.",
		].join("\n");
	};

	fillTextToViewableElementInstruction = (): string => {
		return [
			"Click at (x, y) then type text into the focused input.",
			"When: MV2 fallback for inputs without a readablePath.",
			"How: coordinates from recent captureTab; submit via clickOnCoordinates on submit button or hitEnterOnCoordinates.",
			"Requires: browserId, windowId, tabId, x, y, value.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3; prefer fillTextToElement when readablePath is available.",
		].join("\n");
	};

	hitEnterOnViewableElementInstruction = (): string => {
		return [
			"Click at (x, y) then press Enter to submit a form.",
			"When: MV2 fallback to submit when no submit button readablePath exists.",
			"How: coordinates from recent captureTab.",
			"Requires: browserId, windowId, tabId, x, y.",
			"Returns: ok=true on success; on ok=false re-capture the tab and recompute x/y.",
			"Avoid: on MV3; prefer hitEnterOnElement when readablePath is available.",
		].join("\n");
	};

	clickOnReadableElementInstruction = (): string => {
		return [
			"Click an element by readablePath.",
			"When: primary click method on MV2 and MV3.",
			"How: read {tabUri}/readable-elements; filter [path, role, text, value?] tuples by role and text; copy path exactly (e.g. 0.2.1) — not a CSS selector.",
			"Custom dropdown/combobox/datepicker: click the trigger to open it, then re-read readable-elements and click the option/day cell. Native <select>: clicking an option can work for listbox selects (multiple or size>1) but single-line dropdowns use a native popup that ignores synthetic clicks — those need invokeJsFn (MV2) or showHumanHint (MV3). Verify by re-reading and escalate. See Complex inputs.",
			"Requires: browserId, windowId, tabId, readablePath.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: inventing paths; re-read elements after navigation if click fails.",
		].join("\n");
	};

	fillTextToReadableElementInstruction = (): string => {
		return [
			"Type text into an <input> or <textarea> by readablePath.",
			"When: primary fill method on MV2 and MV3. Also handles native <input> date/time/datetime-local/month/color when value is in the exact format (date YYYY-MM-DD, time HH:MM, datetime-local YYYY-MM-DDTHH:MM, month YYYY-MM, color #rrggbb).",
			"How: readablePath from first element of [path, role, text, value?] tuple in readable-elements; submit via clickOnElement on submit button or hitEnterOnElement.",
			"Requires: browserId, windowId, tabId, readablePath, value.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: CSS selectors as readablePath; stale paths after DOM changes. Does not work on contenteditable rich-text editors (MV2 invokeJsFn instead), native <select>, or custom popup dropdowns/datepickers — use the strategy ladder under Complex inputs in server instructions.",
		].join("\n");
	};

	hitEnterOnReadableElementInstruction = (): string => {
		return [
			"Focus an element by readablePath then press Enter.",
			"When: submitting a form when no explicit submit button exists.",
			"How: readablePath from readable-elements tuple (dot-separated index like 0.2.1).",
			"Requires: browserId, windowId, tabId, readablePath.",
			"Returns: ok=true on success; on ok=false re-read readable-elements and pick a fresh path.",
			"Avoid: using when a submit button readablePath is available — click it instead.",
		].join("\n");
	};

	invokeJsFnInstruction = (): string => {
		return [
			"Execute a JavaScript function body in the page context.",
			"When: MV2 only, and only when element/coordinate tools cannot accomplish the task — e.g. setting a native <select> (.value then dispatch change) or a range slider.",
			"How: fnBodyCode is the function body only (no function wrapper); use return to send a value back. Example: return document.title;",
			"Requires: browserId, windowId, tabId, fnBodyCode.",
			"Returns: value.result = whatever you return (must be JSON-serializable).",
			"Avoid: on manifestVersion 3; wrapping in function () { ... }.",
		].join("\n");
	};

	scrollPageInstruction = (): string => {
		return [
			"Scroll the page viewport in a direction.",
			"When: target content or elements are off-screen; reveal more of the page before reading or interacting. Works on MV2 and MV3 (no screenshot needed).",
			"How: direction is up/down/left/right; optional amount in pixels — omit it to scroll ~one viewport (a page). browserId, windowId, tabId from bk:///context.",
			"Requires: browserId, windowId, tabId, direction.",
			"Returns: ok=true once scrolled. Already at that edge (nothing to scroll) is still ok=true.",
			"Avoid: assuming new elements exist — re-read readable-elements after scrolling, snapshots go stale.",
		].join("\n");
	};

	scrollElementInstruction = (): string => {
		return [
			"Scroll inside a scrollable element (a panel, list, or any container with its own scrollbar).",
			"When: content lives in a scrollable region that scrollPage (whole viewport) does not move — e.g. a chat panel or a long list inside a div. Works on MV2 and MV3 (no screenshot needed).",
			"How: readablePath from a readable-elements tuple; direction is up/down/left/right; optional amount in pixels — omit it to scroll ~90% of the element's size. The element at readablePath is scrolled, or its nearest scrollable ancestor when it isn't itself scrollable (so you can target an interactive child inside the panel). browserId, windowId, tabId from bk:///context.",
			"Requires: browserId, windowId, tabId, readablePath, direction.",
			"Returns: ok=true once scrolled. Already at that edge, or no scrollable container found (nothing to scroll), is still ok=true.",
			"Avoid: using for whole-page scrolling — use scrollPage instead; re-read readable-elements after scrolling, snapshots go stale.",
		].join("\n");
	};

	closeTabInstruction = (): string => {
		return [
			"Close a tab. Irreversible.",
			"When: finished with a tab and no further interaction needed.",
			"How: browserId, windowId, tabId from bk:///context.",
			"Requires: browserId, windowId, tabId.",
			"Returns: ok=true once closed.",
			"Avoid: closing the tab you still need for further interactions.",
		].join("\n");
	};

	getSelectionInstruction = (): string => {
		return [
			"Get the user's current text selection in a tab.",
			"When: you need text the user has highlighted on the page.",
			"How: browserId, windowId, tabId from bk:///context.",
			"Requires: browserId, windowId, tabId.",
			"Returns: value.selectedText — empty string when nothing is selected.",
			"Avoid: expecting content when nothing is selected.",
		].join("\n");
	};

	openTabInstruction = (): string => {
		return [
			"Open a URL in a new tab.",
			"When: navigating to a page not already open.",
			"How: browserId and windowId from bk:///context; url must include scheme (https://); after success re-read context for the new tabId and wait for page load.",
			"Requires: browserId, windowId, url.",
			"Returns: value { browserId, windowId, tabId } — use the returned ids for follow-up calls.",
			"Avoid: interacting immediately — tab needs a moment to load.",
		].join("\n");
	};

	showHumanHintInstruction = (): string => {
		return [
			"Highlight an element and instruct the human to act when automation fails or the step is human-only.",
			"When: CAPTCHA, 2FA, irreversible confirmations, repeated tool failures, or MV3 inputs that tools cannot set (native <select>, range slider).",
			"How: provide exactly one target — readablePath (preferred) OR x and y, not both; fill action requires value.",
			"Requires: browserId, windowId, tabId, action (click | fill | hit-enter), message.",
			"Returns: humanMessage (relay verbatim to the user) and expiresInSeconds.",
			"Avoid: both readablePath and coordinates.",
		].join("\n");
	};

	getContextInstruction = (): string => {
		return [
			"Get aggregated state of every connected browser.",
			"When: discovering available tabs before interacting — equivalent to reading the bk:///context resource.",
			"How: no parameters needed.",
			"Requires: nothing.",
			"Returns: browsers[] (each with browserId, extensionInfo, windows) and tabs (each with id (tabId), windowId, tabUri, url, title, active).",
			"Avoid: calling repeatedly in a tight loop — cache the result for the duration of a task.",
		].join("\n");
	};

	getReadableTextInstruction = (): string => {
		return [
			"Get the readable inner text of a tab.",
			"When: you need the text content of a page — equivalent to reading {tabUri}/readable-text resource.",
			"How: browserId and tabId from getContext or bk:///context.",
			"Requires: browserId, tabId.",
			"Returns: { snapshotId, data (text), hasNextPage, nextPageNumber, totalPages }.",
			"Pagination: if hasNextPage is true, call getSnapshotPage with the returned snapshotId and nextPageNumber.",
		].join("\n");
	};

	getReadableElementsInstruction = (): string => {
		return [
			"Get interactive elements of a tab as [path, role, text, value?] tuples.",
			"When: you need element paths for clickOnElement/fillTextToElement — equivalent to reading {tabUri}/readable-elements resource.",
			"How: browserId and tabId from getContext or bk:///context.",
			"Requires: browserId, tabId.",
			"Returns: { snapshotId, data ([path, role, text, value?] tuples), hasNextPage, nextPageNumber, totalPages }.",
			"path is a dot-separated tree index (e.g. 0.2.1) — use as readablePath in interaction tools.",
			"Pagination: if hasNextPage is true, call getSnapshotPage with the returned snapshotId and nextPageNumber.",
		].join("\n");
	};

	getReadableElementHtmlInstruction = (): string => {
		return [
			"Get the outerHTML of a single element by readablePath.",
			"When: you need the exact markup (attributes, classes, nested structure) of one element — equivalent to reading {tabUri}/readable-element-html/<readablePath>.",
			"How: get readablePath from a readable-elements tuple (first field); browserId and tabId from getContext or bk:///context.",
			"Requires: browserId, tabId, readablePath (dot-separated tree index e.g. 0.2.1, not a CSS selector).",
			"Returns: { snapshotId, data (HTML), hasNextPage, nextPageNumber, totalPages }.",
			"Pagination: if hasNextPage is true, call getSnapshotPage with the returned snapshotId, type readable-element-html, and nextPageNumber.",
		].join("\n");
	};

	getSnapshotPageInstruction = (): string => {
		return [
			"Get a continuation page for a readable-text, readable-elements, or readable-element-html snapshot.",
			"When: a previous getReadableText, getReadableElements, or getReadableElementHtml call returned hasNextPage=true.",
			"How: use the snapshotId and nextPageNumber from the previous response.",
			"Requires: snapshotId, type (readable-text | readable-elements | readable-element-html), pageNumber.",
			"Returns: same shape as the original call — { snapshotId, data, hasNextPage, nextPageNumber, totalPages }.",
			"Avoid: calling without first fetching page 1 via getReadableText, getReadableElements, or getReadableElementHtml.",
		].join("\n");
	};

	contextResourceDescription = (): string => {
		return [
			"Aggregated state of every connected browser — read this first.",
			"browserId is on each browsers[] entry; tabId (id), windowId, and tabUri are on each entry in browsers[].tabs[].",
			"extensionInfo.manifestVersion on each browser gates available tools (2 = all, 3 = element tools only).",
			"Example pointer: browsers[0].tabs[0].tabUri -> append /readable-elements to interact.",
		].join(" ");
	};

	bkResourceTemplateDescription = (): string => {
		return [
			"Per-browser and per-tab resources under bk:///{+resourceId}:",
			"bk:///browsers/<shortId> — full browser snapshot",
			"bk:///browsers/<shortId>/tabs/<tabId> — tab metadata (shortId is the browserId)",
			"bk:///browsers/<shortId>/tabs/<tabId>/readable-text — readable text snapshot (page 1 only)",
			"bk:///browsers/<shortId>/tabs/<tabId>/readable-elements — readable elements snapshot (page 1 only)",
			"bk:///browsers/<shortId>/tabs/<tabId>/readable-element-html/<readablePath> — outerHTML of one element (page 1 only)",
			"bk:///snapshot-types/<type>/snapshots/<snapshotId>/pages/<N> — page 2+ for readable-text, readable-elements, and readable-element-html (use snapshotId from page 1)",
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
			"Returns JSON with snapshotId, data ([path, role, text, value?] tuples), hasNextPage, nextPageNumber, totalPages.",
			"path is a dot-separated tree index (e.g. 0.2.1) — use as readablePath, not a CSS selector.",
			"Page 2+: bk:///snapshot-types/readable-elements/snapshots/<snapshotId>/pages/<nextPageNumber>.",
		].join(" ");
	};

	tabReadableElementHtmlDescription = (
		tabId: string,
		readablePath: string,
	): string => {
		return [
			`outerHTML of element ${readablePath} in tab ${tabId}.`,
			"Returns JSON with snapshotId, data (HTML), hasNextPage, nextPageNumber, totalPages.",
			"readablePath is a dot-separated tree index (e.g. 0.2.1) from a readable-elements tuple, not a CSS selector.",
			"Page 2+: bk:///snapshot-types/readable-element-html/snapshots/<snapshotId>/pages/<nextPageNumber>.",
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
