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

export type ServerToolCallsInputPort = {
	captureTab: (tabKey: string) => Promise<Screenshot>;
	clickOnCoordinates: (tabKey: string, x: number, y: number) => Promise<void>;
	clickOnElement: (tabKey: string, readablePath: string) => Promise<void>;
	closeTab: (tabKey: string) => Promise<void>;
	fillTextToCoordinates: (
		tabKey: string,
		x: number,
		y: number,
		value: string,
	) => Promise<void>;
	fillTextToElement: (
		tabKey: string,
		readablePath: string,
		value: string,
	) => Promise<void>;
	getContext: () => Promise<Context>;
	getReadableElements: (tabKey: string) => Promise<{
		elements: ReadableElementRecord[];
	}>;
	getReadableText: (tabKey: string) => Promise<string>;
	getSelection: (tabKey: string) => Promise<Selection>;
	hitEnterOnCoordinates: (
		tabKey: string,
		x: number,
		y: number,
	) => Promise<void>;
	hitEnterOnElement: (tabKey: string, readablePath: string) => Promise<void>;
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

export type ServerToolName = keyof ServerToolCallsInputPort;

export type ServerToolArgsMap = {
	captureTab: {
		tabKey: string;
	};
	clickOnCoordinates: {
		tabKey: string;
		x: number;
		y: number;
	};
	clickOnElement: {
		tabKey: string;
		readablePath: string;
	};
	closeTab: {
		tabKey: string;
	};
	fillTextToCoordinates: {
		tabKey: string;
		x: number;
		y: number;
		value: string;
	};
	fillTextToElement: {
		tabKey: string;
		readablePath: string;
		value: string;
	};
	getContext: Record<string, never>;
	getReadableElements: {
		tabKey: string;
	};
	getReadableText: {
		tabKey: string;
	};
	getSelection: {
		tabKey: string;
	};
	hitEnterOnCoordinates: {
		tabKey: string;
		x: number;
		y: number;
	};
	hitEnterOnElement: {
		tabKey: string;
		readablePath: string;
	};
	invokeJsFn: {
		tabKey: string;
		fnBodyCode: string;
	};
	openTab: {
		windowKey: string;
		url: string;
	};
};

export type ServerToolArgs<T extends ServerToolName> = ServerToolArgsMap[T];

export type ServerToolResult<T extends ServerToolName> = Awaited<
	ReturnType<ServerToolCallsInputPort[T]>
>;
