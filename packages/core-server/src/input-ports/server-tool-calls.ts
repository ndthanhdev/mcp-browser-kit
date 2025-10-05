import type {
	ExtensionToolName,
	ReadableElementRecord,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type { Screenshot } from "../types";

export interface BrowserTabContext {
	tabKey: string;
	active: boolean;
	title: string;
	url: string;
}

export interface BrowserWindowContext {
	windowKey: string;
	tabs: BrowserTabContext[];
}

export interface BrowserContext {
	browserId: string;
	availableTools: ExtensionToolName[];
	browserWindows: BrowserWindowContext[];
}

export interface Context {
	browsers: BrowserContext[];
}

// ToolsInputPort - Combined interface for all RPC calls
export type ServerToolCallsInputPort = {
	captureTab: (tabKey: string) => Promise<Screenshot>;
	clickOnCoordinates: (tabKey: string, x: number, y: number) => Promise<void>;
	clickOnElement: (tabKey: string, selector: string) => Promise<void>;
	closeTab: (tabKey: string) => Promise<void>;
	fillTextToCoordinates: (
		tabKey: string,
		x: number,
		y: number,
		value: string,
	) => Promise<void>;
	fillTextToElement: (
		tabKey: string,
		selector: string,
		value: string,
	) => Promise<void>;
	getContext: () => Promise<Context>;
	getReadableElements: (tabKey: string) => Promise<ReadableElementRecord[]>;
	getReadableText: (tabKey: string) => Promise<string>;
	getSelection: (tabKey: string) => Promise<Selection>;
	hitEnterOnCoordinates: (
		tabKey: string,
		x: number,
		y: number,
	) => Promise<void>;
	hitEnterOnElement: (tabKey: string, selector: string) => Promise<void>;
	invokeJsFn: (tabKey: string, fnBodyCode: string) => Promise<unknown>;
	openTab: (
		windowKey: string,
		url: string,
	) => Promise<{
		tabKey: string;
		windowKey: string;
	}>;
};
export const ServerToolCallsInputPort = Symbol.for("ServerToolCallsInputPort");
