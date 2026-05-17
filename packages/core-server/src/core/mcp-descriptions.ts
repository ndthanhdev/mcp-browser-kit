import { injectable } from "inversify";
import type { McpDescriptionsInputPort } from "../input-ports";

@injectable()
export class McpDescriptionsUseCases implements McpDescriptionsInputPort {
	getBasicBrowserContextInstruction = (): string => {
		return [
			"🌐 GET BROWSER CONTEXT - CRITICAL FIRST STEP BEFORE USING ANY OTHER TOOLS!",
			"* This tool MUST be called first to initialize browser automation and get essential data.",
			"* Returns data structure with:",
			"  - tabs: Array of browser tabs with properties like id, url, title, and active status",
			"  - manifestVersion: Version of extension manifest format supported by the browser",
			"* Each tab includes a unique tabKey required for all other tool operations",
			"* The active tab (marked with 'active: true') is typically your target for automation",
			"* The manifestVersion determines which browser features and extension capabilities are available",
			"* Different browsers support different manifest versions, affecting available tools and API access",
			"* Standard workflow:",
			"  1) getBasicBrowserContext → get browser state and tabKey",
			"  2) Analyze page content based on your goal and manifest version:",
			"     - If interaction is required (clicking, filling forms, etc.):",
			"       · For Manifest Version 2: Use captureTab for visual context or read the readable-elements resource for element identification",
			"       · For other Manifest Versions: Use only the readable-elements resource for element identification",
			"     - If no interaction is required (just reading page content):",
			"       · Read the readable-text resource to extract all visible text from the page",
			"  3) Interact using click/fill/enter tools with the obtained tabKey",
		].join("\n");
	};

	captureTabInstruction = (): string => {
		return [
			"📷 Captures a screenshot of a browser tab",
			"* Use this tool after calling getBasicBrowserContext to obtain visual context of the page",
			"* The screenshot helps you see what the browser is displaying to the user",
			"* Requires tabKey from getBasicBrowserContext",
			"* Returns an image with width, height, and data in base64 format",
			"* Workflow: 1) getBasicBrowserContext → 2) captureTab → 3) interact with elements",
			"* Parameters: tabKey",
			"* NOTE: This feature is only available in browsers supporting Manifest Version 2",
		].join("\n");
	};

	clickOnViewableElementInstruction = (): string => {
		return [
			"👆 Clicks on an element at specific X,Y coordinates",
			"* Use this to click on elements by their position on the screen",
			"* Requires tabKey from getBasicBrowserContext and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureTab screenshot dimensions",
			"* Useful when you know the visual position of an element",
			"* Parameters: tabKey, x, y",
		].join("\n");
	};

	fillTextToViewableElementInstruction = (): string => {
		return [
			"⌨️ Types text into an input field at specific X,Y coordinates",
			"* Use this to enter text into form fields by their position",
			"* Requires tabKey from getBasicBrowserContext, x,y coordinates, and the text to enter",
			"* Coordinates are based on the captureTab screenshot dimensions",
			"* First clicks at the specified position, then types the provided text",
			"* After filling text, check for associated submit-like buttons (submit, search, send, etc.)",
			"* If submit button is visible, use clickOnViewableElement with that button",
			"* If no submit button is visible, use hitEnterOnViewableElement instead",
			"* Parameters: tabKey, x, y, value (text to enter)",
		].join("\n");
	};

	hitEnterOnViewableElementInstruction = (): string => {
		return [
			"↵ Hits the Enter key on an element at specific X,Y coordinates",
			"* Use this to trigger actions like form submission or button clicks",
			"* Requires tabKey from getBasicBrowserContext and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureTab screenshot dimensions",
			"* Parameters: tabKey, x, y",
		].join("\n");
	};

	clickOnReadableElementInstruction = (): string => {
		return [
			"🔘 Clicks on an element identified by its readablePath from the readable-elements resource",
			"* Use this to click on elements after identifying them by their text",
			"* Requires tabKey from getBasicBrowserContext and readablePath from the readable-elements resource",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First read the readable-elements resource to get the readablePath, then use this tool",
			"* Parameters: tabKey, readablePath",
		].join("\n");
	};

	fillTextToReadableElementInstruction = (): string => {
		return [
			"✏️ Types text into an input field identified by its readablePath from the readable-elements resource",
			"* Use this to enter text into form fields identified by their text",
			"* Requires tabKey from getBasicBrowserContext, readablePath from the readable-elements resource, and text to enter",
			"* Works with text inputs, textareas, and other editable elements",
			"* First read the readable-elements resource to get the readablePath, then use this tool",
			"* After filling text, check for associated submit-like buttons (submit, search, send, etc.)",
			"* If submit button is visible, use clickOnReadableElement with that button",
			"* If no submit button is visible, use hitEnterOnReadableElement instead",
			"* Parameters: tabKey, readablePath, value (text to enter)",
		].join("\n");
	};

	hitEnterOnReadableElementInstruction = (): string => {
		return [
			"↵ Hits the Enter key on an element identified by its readablePath from the readable-elements resource",
			"* Use this to trigger actions like form submission or button clicks",
			"* Requires tabKey from getBasicBrowserContext and readablePath from the readable-elements resource",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First read the readable-elements resource to get the readablePath, then use this tool",
			"* Parameters: tabKey, readablePath",
		].join("\n");
	};

	invokeJsFnInstruction = (): string => {
		return [
			"⚙️ Executes custom JavaScript code in the context of the web page",
			"* Use this for advanced operations not covered by other tools",
			"* Requires tabKey from getBasicBrowserContext and JavaScript code to execute",
			"* The code should be the body of a function that returns a value",
			"* Example: 'return document.title;' to get the page title",
			"* Gives you full flexibility for custom browser automation",
			"* Parameters: tabKey, fnBodyCode (JavaScript code as string)",
			"* NOTE: This feature is only available in browsers supporting Manifest Version 2",
		].join("\n");
	};

	closeTabInstruction = (): string => {
		return [
			"🗑️ Closes a specific browser tab",
			"* Use this to close a tab when you're done with it or need to clean up",
			"* Requires tabKey from getBasicBrowserContext",
			"* The tab will be permanently closed and cannot be recovered",
			"* Be careful not to close the tab you're currently working with",
			"* Parameters: tabKey",
		].join("\n");
	};

	getSelectionInstruction = (): string => {
		return [
			"📋 Gets the current text selection in the browser tab",
			"* Use this to retrieve text that the user has selected on the page",
			"* Requires tabKey from getBasicBrowserContext",
			"* Returns information about the selected text including the text content itself",
			"* Useful for capturing user selections or verifying what text is highlighted",
			"* Returns empty selection if nothing is currently selected",
			"* Parameters: tabKey",
		].join("\n");
	};

	openTabInstruction = (): string => {
		return [
			"🌐 Opens a new browser tab with the specified URL",
			"* Use this to navigate to a new page in a new tab",
			"* Requires windowKey from getBasicBrowserContext and the URL to open",
			"* Returns the tabKey of the newly created tab which you can use for further operations",
			"* The new tab will be created in the specified browser window",
			"* After opening, you may need to wait a moment for the page to load",
			"* Parameters: windowKey, url",
		].join("\n");
	};

	bkResourceTemplateDescription = (): string => {
		return "Browser or tab resource. Browser: per-channel state snapshot. Tab: metadata for a single tab (title, url, active state, window, last content change).";
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
		return `Page inner text for tab ${tabId}`;
	};

	tabReadableElementsDescription = (tabId: string): string => {
		return `Interactive elements for tab ${tabId}`;
	};

	private hostnameOf(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}
}
