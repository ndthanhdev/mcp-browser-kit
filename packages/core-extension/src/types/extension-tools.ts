import type { ExtensionContext } from "./extension-context";
import type { Screenshot } from "./screenshot";

export interface ExtensionTools {
	getExtensionContext(): Promise<ExtensionContext>;
	captureTab(windowId: string, tabId: string): Promise<Screenshot>;
	// Move these to server
	// getInnerText(windowId: string, tabId: string): Promise<string>;
	// getReadableElements(
	// 	windowId: string,
	// 	tabId: string
	// ): Promise<ElementRecord[]>;
	clickOnViewableElement(
		windowId: string,
		tabId: string,
		x: number,
		y: number
	): Promise<void>;
	fillTextToViewableElement(
		windowId: string,
		tabId: string,
		x: number,
		y: number,
		value: string
	): Promise<void>;
	hitEnterOnViewableElement(
		windowId: string,
		tabId: string,
		x: number,
		y: number
	): Promise<void>;
	clickOnElement(
		windowId: string,
		tabId: string,
		selector: string
	): Promise<void>;
	fillTextToElement(
		windowId: string,
		tabId: string,
		selector: string,
		value: string
	): Promise<void>;
	hitEnterOnElement(
		windowId: string,
		tabId: string,
		selector: string
	): Promise<void>;
	invokeJsFn(
		windowId: string,
		tabId: string,
		fnBodyCode: string
	): Promise<unknown>;
}

export type ExtensionToolName = keyof ExtensionTools;
