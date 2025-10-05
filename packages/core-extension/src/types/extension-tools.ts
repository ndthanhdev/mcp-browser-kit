import type { ExtensionContext } from "./extension-context";
import type { ReadableElementRecord } from "./readable-element-record";
import type { Screenshot } from "./screenshot";
import type { Selection } from "./selection";
import type { TabContext } from "./tab-context";

export interface ExtensionTools {
	captureTab(tabId: string): Promise<Screenshot>;
	clickOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	clickOnElement(tabId: string, selector: string): Promise<void>;
	closeTab(tabId: string): Promise<void>;
	fillTextToCoordinates(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void>;
	fillTextToElement(
		tabId: string,
		selector: string,
		value: string,
	): Promise<void>;
	getExtensionContext(): Promise<ExtensionContext>;
	loadTabContext(tabId: string): Promise<TabContext>;
	getReadableElements: (tabKey: string) => Promise<ReadableElementRecord[]>;
	getReadableText: (tabKey: string) => Promise<string>;
	getSelection(tabId: string): Promise<Selection>;
	hitEnterOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	hitEnterOnElement(tabId: string, selector: string): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
	openTab(
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}>;
}

export type ExtensionToolName = keyof ExtensionTools;
