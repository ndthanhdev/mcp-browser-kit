import { inject, injectable } from "inversify";
import type { Tab } from "../entities/tab";
import { ExtensionDriverOutputPort } from "../output-ports";
import type { RpcCallInputPort } from "../input-ports";
import type { ReadableElement, Screenshot } from "../entities";

@injectable()
export class RpcCallUseCase implements RpcCallInputPort {
	constructor(
		@inject(ExtensionDriverOutputPort)
		private readonly browserDriver: ExtensionDriverOutputPort,
	) {}

	// CaptureActiveTab methods
	captureActiveTabInstruction(): string {
		return [
			"📷 Captures a screenshot of the active browser tab",
			"* Use this tool after calling getTabs to obtain visual context of the current page",
			"* The screenshot helps you see what the browser is displaying to the user",
			"* No parameters are needed as it automatically captures the active tab",
			"* Returns an image with width, height, and data in base64 format",
			"* Workflow: 1) getTabs → 2) captureActiveTab → 3) interact with elements",
		].join("\n");
	}

	captureActiveTab(): Promise<Screenshot> {
		return this.browserDriver.captureActiveTab();
	}

	// ClickOnReadableElement methods
	clickOnReadableElementInstruction(): string {
		return [
			"🔘 Clicks on an element identified by its index from getReadableElements",
			"* Use this to click on elements after identifying them by their text",
			"* Requires tabId from getTabs and index from getReadableElements",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index",
		].join("\n");
	}

	clickOnReadableElement(tabId: string, index: number): Promise<void> {
		return this.browserDriver.clickOnReadableElement(tabId, index);
	}

	// ClickOnViewableElement methods
	clickOnViewableElementInstruction(): string {
		return [
			"👆 Clicks on an element at specific X,Y coordinates",
			"* Use this to click on elements by their position on the screen",
			"* Requires tabId from getTabs and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* Useful when you know the visual position of an element",
			"* Parameters: tabId, x, y",
		].join("\n");
	}

	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void> {
		return this.browserDriver.clickOnViewableElement(tabId, x, y);
	}

	// FillTextToReadableElement methods
	fillTextToReadableElementInstruction(): string {
		return [
			"✏️ Types text into an input field identified by its index from getReadableElements",
			"* Use this to enter text into form fields identified by their text",
			"* Requires tabId from getTabs, index from getReadableElements, and text to enter",
			"* Works with text inputs, textareas, and other editable elements",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index, value (text to enter)",
		].join("\n");
	}

	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void> {
		return this.browserDriver.fillTextToReadableElement(tabId, index, value);
	}

	// FillTextToViewableElement methods
	fillTextToViewableElementInstruction(): string {
		return [
			"⌨️ Types text into an input field at specific X,Y coordinates",
			"* Use this to enter text into form fields by their position",
			"* Requires tabId from getTabs, x,y coordinates, and the text to enter",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* First clicks at the specified position, then types the provided text",
			"* Parameters: tabId, x, y, value (text to enter)",
		].join("\n");
	}

	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> {
		return this.browserDriver.fillTextToViewableElement(tabId, x, y, value);
	}

	// GetInnerText methods
	getInnerTextInstruction(): string {
		return [
			"📝 Extracts all text content from the current web page",
			"* Retrieves all visible text from the active tab",
			"* Requires the tabId obtained from getTabs",
			"* Use this to analyze the page content without visual elements",
			"* Returns a string containing all the text on the page",
			"* Useful for getting a quick overview of page content",
		].join("\n");
	}

	getInnerText(tabId: string): Promise<string> {
		return this.browserDriver.getInnerText(tabId);
	}

	// GetReadableElements methods
	getReadableElementsInstruction(): string {
		return [
			"🔍 Lists all interactive elements on the page with their text",
			"* Returns a list of elements with their index, HTML tag, and text content",
			"* Requires the tabId obtained from getTabs",
			"* Each element is returned as [index, tag, text]",
			"* Use the index to interact with elements through click or fill operations",
			"* Helps you identify which elements can be interacted with by their text",
		].join("\n");
	}

	getReadableElements(tabId: string): Promise<ReadableElement[]> {
		return this.browserDriver.getReadableElements(tabId);
	}

	// GetTabs methods
	getTabsInstruction(): string {
		return [
			"⚠️ CRITICAL FIRST STEP - ALWAYS START HERE BEFORE ANY OTHER TOOLS!",
			"* This tool MUST be called first to obtain the list of open browser tabs.",
			"* Each tab includes a unique ID that is required for all subsequent tool operations.",
			"* Note which tab is active (marked with 'active: true') as this is essential information.",
			"* The tabId from this list is required for captureActiveTab and all other interactions.",
			"* Workflow: 1) getTabs → 2) captureActiveTab → 3) interact with elements",
		].join("\n");
	}

	getTabs(): Promise<Tab[]> {
		return this.browserDriver.getTabs();
	}

	// InvokeJsFn methods
	invokeJsFnInstruction(): string {
		return [
			"⚙️ Executes custom JavaScript code in the context of the web page",
			"* Use this for advanced operations not covered by other tools",
			"* Requires tabId from getTabs and JavaScript code to execute",
			"* The code should be the body of a function that returns a value",
			"* Example: 'return document.title;' to get the page title",
			"* Gives you full flexibility for custom browser automation",
			"* Parameters: tabId, fnBodyCode (JavaScript code as string)",
		].join("\n");
	}

	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return this.browserDriver.invokeJsFn(tabId, fnBodyCode);
	}
}
