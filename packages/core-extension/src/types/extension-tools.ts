import type { ExtensionContext } from "./extension-context";
import type { ReadableElementRecord } from "./readable-element-record";
import type { Screenshot } from "./screenshot";
import type { Selection } from "./selection";
import type { TabContext } from "./tab-context";

export interface TabSpecificTool {
	captureTab(tabId: string): Promise<Screenshot>;
	clickOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	clickOnElement(tabId: string, readablePath: string): Promise<void>;
	closeTab(tabId: string): Promise<void>;
	fillTextToCoordinates(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void>;
	fillTextToElement(
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<void>;
	loadTabContext(tabId: string): Promise<TabContext>;
	getReadableElements: (tabId: string) => Promise<ReadableElementRecord[]>;
	getReadableText: (tabId: string) => Promise<string>;
	getSelection(tabId: string): Promise<Selection>;
	hitEnterOnCoordinates(tabId: string, x: number, y: number): Promise<void>;
	hitEnterOnElement(tabId: string, readablePath: string): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}

export interface ExtensionTools extends TabSpecificTool {
	getExtensionContext(): Promise<ExtensionContext>;
	openTab(
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}>;
}

export type ExtensionToolName = keyof ExtensionTools;
