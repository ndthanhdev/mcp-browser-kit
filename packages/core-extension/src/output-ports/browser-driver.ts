import type {
	ElementRecord,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
} from "../types";

export interface BrowserDriverOutputPort {
	getTabs(): Promise<ExtensionTabInfo[]>;
	getWindows(): Promise<ExtensionWindowInfo[]>;
	getExtensionInfo(): Promise<ExtensionInfo>;
	openTab(
		url: string,
		windowId: string
	): Promise<{ tabId: string; windowId: string }>;
	closeTab(tabId: string): Promise<void>;
	captureTab(tabId: string): Promise<Screenshot>;
	getHtml(tabId: string): Promise<string>;
	getSelection(tabId: string): Promise<Selection>;
	getInnerText(tabId: string): Promise<string>;
	getReadableElements(tabId: string): Promise<ElementRecord[]>;
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void>;
	focusOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	fillTextToFocusedElement(tabId: string, value: string): Promise<void>;
	hitEnterOnFocusedElement(tabId: string): Promise<void>;
	clickOnElementBySelector(tabId: string, selector: string): Promise<void>;
	fillTextToElementBySelector(
		tabId: string,
		selector: string,
		value: string
	): Promise<void>;
	hitEnterOnElementBySelector(tabId: string, selector: string): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}

export const BrowserDriverOutputPort = Symbol("BrowserDriverOutputPort");
