import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
	TabContext,
} from "../types";

export interface BrowserDriverOutputPort {
	getTabs(): Promise<ExtensionTabInfo[]>;
	getWindows(): Promise<ExtensionWindowInfo[]>;
	getBrowserInfo(): Promise<BrowserInfo>;
	getExtensionInfo(): Promise<ExtensionInfo>;
	getBrowserId(): Promise<string>;
	openTab(
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}>;
	loadTabContext(tabId: string): Promise<TabContext>;
	closeTab(tabId: string): Promise<void>;
	captureTab(tabId: string): Promise<Screenshot>;
	getSelection(tabId: string): Promise<Selection>;
	clickOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	focusOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	fillTextToFocusedElement(tabId: string, value: string): Promise<void>;
	hitEnterOnFocusedElement(tabId: string): Promise<void>;
	clickOnElementByReadablePath(
		tabId: string,
		readableTreePath: string,
	): Promise<void>;
	fillTextToElementByReadablePath(
		tabId: string,
		readableTreePath: string,
		value: string,
	): Promise<void>;
	hitEnterOnElementByReadablePath(
		tabId: string,
		readableTreePath: string,
	): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}

export const BrowserDriverOutputPort = Symbol("BrowserDriverOutputPort");
