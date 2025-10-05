import { injectable } from "inversify";
import type { ToolDescriptionsInputPort } from "../input-ports";

@injectable()
export class ToolDescriptionsUseCases implements ToolDescriptionsInputPort {
	getBasicBrowserContextInstruction = (): string => {
		return [
			"🌐 GET BROWSER CONTEXT - CRITICAL FIRST STEP BEFORE USING ANY OTHER TOOLS!",
			"* This tool MUST be called first to initialize browser automation and get essential data.",
			"* Returns data structure with:",
			"  - tabs: Array of browser tabs with properties like id, url, title, and active status",
			"  - manifestVersion: Version of extension manifest format supported by the browser",
			"* Each tab includes a unique tabId required for all other tool operations",
			"* The active tab (marked with 'active: true') is typically your target for automation",
			"* The manifestVersion determines which browser features and extension capabilities are available",
			"* Different browsers support different manifest versions, affecting available tools and API access",
			"* Standard workflow:",
			"  1) getBasicBrowserContext → get browser state and tabId",
			"  2) Analyze page content based on your goal and manifest version:",
			"     - If interaction is required (clicking, filling forms, etc.):",
			"       · For Manifest Version 2: Use captureActiveTab for visual context or getReadableElements for element identification",
			"       · For other Manifest Versions: Use only getReadableElements for element identification",
			"     - If no interaction is required (just reading page content):",
			"       · Use getReadableText to extract all visible text from the page",
			"  3) Interact using click/fill/enter tools with the obtained tabId",
		].join("\n");
	};

	captureActiveTabInstruction = (): string => {
		return [
			"📷 Captures a screenshot of the active browser tab",
			"* Use this tool after calling getBasicBrowserContext to obtain visual context of the current page",
			"* The screenshot helps you see what the browser is displaying to the user",
			"* No parameters are needed as it automatically captures the active tab",
			"* Returns an image with width, height, and data in base64 format",
			"* Workflow: 1) getBasicBrowserContext → 2) captureActiveTab → 3) interact with elements",
			"* NOTE: This feature is only available in browsers supporting Manifest Version 2",
		].join("\n");
	};

	getReadableTextInstruction = (): string => {
		return [
			"📝 Extracts all text content from the current web page",
			"* Retrieves all visible text from the active tab",
			"* Requires the tabId obtained from getBasicBrowserContext",
			"* Use this to analyze the page content without visual elements",
			"* Returns a string containing all the text on the page",
			"* Useful for getting a quick overview of page content",
		].join("\n");
	};

	getReadableElementsInstruction = (): string => {
		return [
			"🔍 Lists all interactive elements on the page with their text",
			"* Returns a list of elements with their elementId, role, and text content",
			"* Requires the tabId obtained from getBasicBrowserContext",
			"* Each element is returned as {elementId, role, accessibleText}",
			"* Use the elementId to interact with elements through click or fill operations",
			"* Helps you identify which elements can be interacted with by their text",
		].join("\n");
	};

	clickOnViewableElementInstruction = (): string => {
		return [
			"👆 Clicks on an element at specific X,Y coordinates",
			"* Use this to click on elements by their position on the screen",
			"* Requires tabId from getBasicBrowserContext and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* Useful when you know the visual position of an element",
			"* Parameters: tabId, x, y",
		].join("\n");
	};

	fillTextToViewableElementInstruction = (): string => {
		return [
			"⌨️ Types text into an input field at specific X,Y coordinates",
			"* Use this to enter text into form fields by their position",
			"* Requires tabId from getBasicBrowserContext, x,y coordinates, and the text to enter",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* First clicks at the specified position, then types the provided text",
			"* After filling text, check for associated submit-like buttons (submit, search, send, etc.)",
			"* If submit button is visible, use clickOnViewableElement with that button",
			"* If no submit button is visible, use hitEnterOnViewableElement instead",
			"* Parameters: tabId, x, y, value (text to enter)",
		].join("\n");
	};

	hitEnterOnViewableElementInstruction = (): string => {
		return [
			"↵ Hits the Enter key on an element at specific X,Y coordinates",
			"* Use this to trigger actions like form submission or button clicks",
			"* Requires tabId from getBasicBrowserContext and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* Parameters: tabId, x, y",
		].join("\n");
	};

	clickOnReadableElementInstruction = (): string => {
		return [
			"🔘 Clicks on an element identified by its index from getReadableElements",
			"* Use this to click on elements after identifying them by their text",
			"* Requires tabId from getBasicBrowserContext and index from getReadableElements",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index",
		].join("\n");
	};

	fillTextToReadableElementInstruction = (): string => {
		return [
			"✏️ Types text into an input field identified by its index from getReadableElements",
			"* Use this to enter text into form fields identified by their text",
			"* Requires tabId from getBasicBrowserContext, index from getReadableElements, and text to enter",
			"* Works with text inputs, textareas, and other editable elements",
			"* First call getReadableElements to get the index, then use this tool",
			"* After filling text, check for associated submit-like buttons (submit, search, send, etc.)",
			"* If submit button is visible, use clickOnReadableElement with that button",
			"* If no submit button is visible, use hitEnterOnReadableElement instead",
			"* Parameters: tabId, index, value (text to enter)",
		].join("\n");
	};

	hitEnterOnReadableElementInstruction = (): string => {
		return [
			"↵ Hits the Enter key on an element identified by its index from getReadableElements",
			"* Use this to trigger actions like form submission or button clicks",
			"* Requires tabId from getBasicBrowserContext and index from getReadableElements",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index",
		].join("\n");
	};

	invokeJsFnInstruction = (): string => {
		return [
			"⚙️ Executes custom JavaScript code in the context of the web page",
			"* Use this for advanced operations not covered by other tools",
			"* Requires tabId from getBasicBrowserContext and JavaScript code to execute",
			"* The code should be the body of a function that returns a value",
			"* Example: 'return document.title;' to get the page title",
			"* Gives you full flexibility for custom browser automation",
			"* Parameters: tabId, fnBodyCode (JavaScript code as string)",
			"* NOTE: This feature is only available in browsers supporting Manifest Version 2",
		].join("\n");
	};
}
