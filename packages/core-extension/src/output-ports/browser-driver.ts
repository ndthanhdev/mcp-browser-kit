import type {
	Func,
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
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
	getElementHtmlByReadablePath(
		tabId: string,
		readableTreePath: string,
	): Promise<string>;
	showHumanHint(
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
	/** Establish the RPC link to tab content scripts; returns an unlink function. */
	linkRpc(): Func;
	/** Tear down the RPC link to tab content scripts. */
	unlinkRpc(): void;
}

export const BrowserDriverOutputPort = Symbol("BrowserDriverOutputPort");
