import type {
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import type { ExtensionContext } from "./extension-context";
import type { PageChange } from "./page-change";
import type { PageSaveFormat, PageSaveResult } from "./page-save";
import type { ReadableElementRecord } from "./readable-element-record";
import type { Screenshot } from "./screenshot";
import type { Selection } from "./selection";
import type { TabContext } from "./tab-context";

/** Direction the viewport is scrolled by the `scrollPage` tool. */
export type ScrollDirection = "up" | "down" | "left" | "right";

export interface TabSpecificTool {
	captureTab(tabId: string): Promise<Screenshot>;
	savePage(tabId: string, format: PageSaveFormat): Promise<PageSaveResult>;
	clickOnCoordinates(tabId: string, x: number, y: number): Promise<PageChange>;
	clickOnElement(tabId: string, readablePath: string): Promise<PageChange>;
	closeTab(tabId: string): Promise<void>;
	scrollPage(
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange>;
	scrollElement(
		tabId: string,
		readablePath: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange>;
	fillTextToCoordinates(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<PageChange>;
	fillTextToElement(
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<PageChange>;
	loadTabContext(tabId: string): Promise<TabContext>;
	getReadableElements: (tabId: string) => Promise<ReadableElementRecord[]>;
	getReadableText: (tabId: string) => Promise<string>;
	getElementHtml: (tabId: string, readablePath: string) => Promise<string>;
	getSelection(tabId: string): Promise<Selection>;
	hitEnterOnCoordinates(
		tabId: string,
		x: number,
		y: number,
	): Promise<PageChange>;
	hitEnterOnElement(tabId: string, readablePath: string): Promise<PageChange>;
	showHumanHint(
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult>;
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
