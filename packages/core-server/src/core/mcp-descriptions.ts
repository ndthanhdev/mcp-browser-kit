import { injectable } from "inversify";
import type { McpDescriptionsInputPort } from "../input-ports";

@injectable()
export class McpDescriptionsUseCases implements McpDescriptionsInputPort {
	serverInstructions = (): string => {
		return [
			"MCP Browser Kit observes and controls connected browsers via an extension.",
			"",
			"Workflow:",
			"1. Read `bk:///context` first. It returns every connected browser with its windows and tabs, including the `tabKey`, `windowKey`, `tabUri`, and `extensionInfo.manifestVersion` that downstream tools require.",
			"2. Pick an interaction strategy per tab based on `manifestVersion`:",
			"   - MV2: `captureTab` + coordinate tools (`clickOnCoordinates`, `fillTextToCoordinates`, `hitEnterOnCoordinates`) and `invokeJsFn` are available.",
			"   - MV3 (or unknown): use readable-element tools (`clickOnElement`, `fillTextToElement`, `hitEnterOnElement`); coordinate tools and `invokeJsFn` are NOT available.",
			"3. For readable-element tools, read `<tabUri>/readable-elements` to get `[readablePath, role, text]` tuples. For raw page text, read `<tabUri>/readable-text`.",
			"4. Prefer readable-element tools over coordinate tools when both work — they are more robust to layout changes and work on MV3.",
			"5. `readable-text` and `readable-elements` are paginated. Reading the base URI returns page 1. Check `hasNextPage`; if true, read `<tabUri>/readable-text/pages/<nextPageNumber>` (or `readable-elements/pages/<nextPageNumber>`) to continue. Always read page 1 first — it caches the content for subsequent page fetches.",
			"",
			"Resources:",
			"* `bk:///context` — aggregated browser/window/tab list. Always read first.",
			"* `bk:///{+resourceId}` — per-browser and per-tab resources; see template description.",
			"* `readable-text` and `readable-elements` return paginated JSON with `hasNextPage`, `nextPageNumber`, and `totalPages`. Fetch `/pages/<N>` to get subsequent pages.",
			"* Subscribe to any URI to receive `notifications/resources/updated` when content changes; cached snapshots become stale after navigation.",
			"",
			"Constraints:",
			"* Resource lists are capped at 200 tabs and 100 completion suggestions.",
			"* `tabKey` and `windowKey` are opaque — always source them from `bk:///context`, never construct them.",
		].join("\n");
	};

	captureTabInstruction = (): string => {
		return [
			"📷 Screenshot a tab. Returns base64 image with `width`, `height`, `mimeType`.",
			"* Use the returned dimensions to compute pixel coordinates for `clickOnCoordinates`, `fillTextToCoordinates`, and `hitEnterOnCoordinates`.",
			"* Requires `tabKey` from `bk:///context`.",
			"* MV2 only. On MV3 tabs, use the `readable-elements` resource instead.",
		].join("\n");
	};

	clickOnViewableElementInstruction = (): string => {
		return [
			"👆 Click at pixel coordinates inside a tab.",
			"* Coordinates must come from a recent `captureTab` (same dimensions).",
			"* Requires `tabKey`, `x`, `y`.",
			"* Prefer `clickOnElement` when a `readablePath` is available — more reliable and works on MV3.",
		].join("\n");
	};

	fillTextToViewableElementInstruction = (): string => {
		return [
			"⌨️ Click at (x, y) then type text into the focused input.",
			"* Coordinates must come from a recent `captureTab`.",
			"* Requires `tabKey`, `x`, `y`, `value`.",
			"* To submit afterwards: `clickOnCoordinates` on a visible submit button, otherwise `hitEnterOnCoordinates`.",
			"* Prefer `fillTextToElement` when a `readablePath` is available.",
		].join("\n");
	};

	hitEnterOnViewableElementInstruction = (): string => {
		return [
			"↵ Click at (x, y) then press Enter (typically to submit a form).",
			"* Coordinates must come from a recent `captureTab`.",
			"* Requires `tabKey`, `x`, `y`.",
		].join("\n");
	};

	clickOnReadableElementInstruction = (): string => {
		return [
			"🔘 Click an element by `readablePath`.",
			"* Get `readablePath` from `<tabUri>/readable-elements` (returns `[readablePath, role, text]` tuples).",
			"* Requires `tabKey`, `readablePath`.",
			"* Works on both MV2 and MV3 — prefer this over `clickOnCoordinates`.",
		].join("\n");
	};

	fillTextToReadableElementInstruction = (): string => {
		return [
			"✏️ Type text into an element by `readablePath`.",
			"* Get `readablePath` from `<tabUri>/readable-elements`.",
			"* Works with text inputs, textareas, and other editable elements.",
			"* Requires `tabKey`, `readablePath`, `value`.",
			"* To submit afterwards: `clickOnElement` on a visible submit button, otherwise `hitEnterOnElement`.",
		].join("\n");
	};

	hitEnterOnReadableElementInstruction = (): string => {
		return [
			"↵ Focus an element by `readablePath` then press Enter.",
			"* Use to submit forms when no explicit submit button exists.",
			"* Requires `tabKey`, `readablePath`.",
		].join("\n");
	};

	invokeJsFnInstruction = (): string => {
		return [
			"⚙️ Execute a JavaScript function body in the page context.",
			"* `fnBodyCode` is the function body (no enclosing `function () { ... }`); use `return` to send a value back. The return value is JSON-serialized.",
			"* Example: `return document.title;`.",
			"* Requires `tabKey`, `fnBodyCode`.",
			"* MV2 only. Use only when other tools cannot accomplish the task.",
		].join("\n");
	};

	closeTabInstruction = (): string => {
		return [
			"🗑️ Close a tab. Irreversible.",
			"* Requires `tabKey`.",
			"* Do not close the tab you still need for further interactions.",
		].join("\n");
	};

	getSelectionInstruction = (): string => {
		return [
			"📋 Get the user's current text selection in a tab.",
			"* Requires `tabKey`.",
			"* Returns an empty selection when nothing is highlighted.",
		].join("\n");
	};

	openTabInstruction = (): string => {
		return [
			"🌐 Open a URL in a new tab.",
			"* Requires `windowKey` from `bk:///context` and the target `url`.",
			"* Returns the new `tabKey` and `windowKey`. The tab needs a brief moment to finish loading before it is safe to interact with.",
		].join("\n");
	};

	contextResourceDescription = (): string => {
		return [
			"Aggregated state of every connected browser — read this first.",
			"Each browser entry includes `windows[]` (with `windowKey` for `openTab`) and `tabs[]` (with `tabKey` for interaction tools, `tabUri` for `readable-text`/`readable-elements`, and `extensionInfo.manifestVersion` which gates available tools).",
		].join("\n");
	};

	bkResourceTemplateDescription = (): string => {
		return [
			"Per-browser and per-tab resources under `bk:///{+resourceId}`:",
			"* `bk:///browsers/<shortId>` — full browser snapshot",
			"* `bk:///browsers/<shortId>/tabs/<tabId>` — tab metadata with `tabKey`",
			"* `bk:///browsers/<shortId>/tabs/<tabId>/readable-text` — page inner text (paginated, read base URI for page 1)",
			"* `bk:///browsers/<shortId>/tabs/<tabId>/readable-text/pages/<N>` — page N of readable text",
			"* `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements` — `[readablePath, role, text]` tuples (paginated, read base URI for page 1)",
			"* `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements/pages/<N>` — page N of readable elements",
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
			`Paginated inner text for tab ${tabId}.`,
			"Returns JSON with `data` (text), `hasNextPage`, `nextPageNumber`, `totalPages`.",
			"If `hasNextPage` is true, read `.../readable-text/pages/<nextPageNumber>` to continue.",
			"Always read this base URI first (page 1) before fetching subsequent pages.",
		].join(" ");
	};

	tabReadableElementsDescription = (tabId: string): string => {
		return [
			`Paginated interactive elements for tab ${tabId}.`,
			"Returns JSON with `data` (`[readablePath, role, text]` tuples), `hasNextPage`, `nextPageNumber`, `totalPages`.",
			"If `hasNextPage` is true, read `.../readable-elements/pages/<nextPageNumber>` to continue.",
			"Always read this base URI first (page 1) before fetching subsequent pages.",
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
