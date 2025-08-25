import type { ExtensionContext } from "./extension-context";
import type { Screenshot } from "./screenshot";
import type { Selection } from "./selection";

export interface ExtensionTools {
	getExtensionContext(): Promise<ExtensionContext>;
	openTab(
		url: string,
		windowId: string
	): Promise<{
		tabId: string;
		windowId: string;
	}>;
	closeTab(tabId: string): Promise<void>;
	captureTab(tabId: string): Promise<Screenshot>;
	// Move these to server
	// getInnerText(windowId: string, tabId: string): Promise<string>;
	// getReadableElements(
	// 	windowId: string,
	// 	tabId: string
	// ): Promise<ElementRecord[]>;
	getHtml(tabId: string): Promise<string>;
	getSelection(tabId: string): Promise<Selection>;
	clickOnCoordinates(
		tabId: string,
		x: number,
		y: number
	): Promise<void>;
	fillTextToCoordinates(
		tabId: string,
		x: number,
		y: number,
		value: string
	): Promise<void>;
	hitEnterOnCoordinates(
		tabId: string,
		x: number,
		y: number
	): Promise<void>;
	clickOnElement(
		tabId: string,
		selector: string
	): Promise<void>;
	fillTextToElement(
		tabId: string,
		selector: string,
		value: string
	): Promise<void>;
	hitEnterOnElement(
		tabId: string,
		selector: string
	): Promise<void>;
	invokeJsFn(
		tabId: string,
		fnBodyCode: string
	): Promise<unknown>;
}

export type ExtensionToolName = keyof ExtensionTools;
