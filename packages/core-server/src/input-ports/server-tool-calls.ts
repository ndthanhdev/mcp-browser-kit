import type {
	ExtensionToolName,
	ReadableElementRecord,
	ScrollDirection,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type {
	HumanHintResponse,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import type { Screenshot } from "../types";

export interface BrowserTabContext {
	windowId: string;
	tabId: string;
	active: boolean;
	title: string;
	url: string;
}

export interface BrowserWindowContext {
	windowId: string;
	tabs: BrowserTabContext[];
}

export interface BrowserContext {
	/** Short channel id — the public-facing browser identifier. */
	browserId: string;
	availableTools: ExtensionToolName[];
	browserWindows: BrowserWindowContext[];
}

export interface Context {
	browsers: BrowserContext[];
}

export type ServerToolCallsInputPort = {
	captureTab: (
		browserId: string,
		windowId: string,
		tabId: string,
	) => Promise<Screenshot>;
	clickOnCoordinates: (
		browserId: string,
		windowId: string,
		tabId: string,
		x: number,
		y: number,
	) => Promise<void>;
	clickOnElement: (
		browserId: string,
		windowId: string,
		tabId: string,
		readablePath: string,
	) => Promise<void>;
	closeTab: (
		browserId: string,
		windowId: string,
		tabId: string,
	) => Promise<void>;
	fillTextToCoordinates: (
		browserId: string,
		windowId: string,
		tabId: string,
		x: number,
		y: number,
		value: string,
	) => Promise<void>;
	fillTextToElement: (
		browserId: string,
		windowId: string,
		tabId: string,
		readablePath: string,
		value: string,
	) => Promise<void>;
	getContext: () => Promise<Context>;
	getReadableTextByChannelAndTab: (
		channelId: string,
		tabId: string,
	) => Promise<string>;
	getReadableElementsByChannelAndTab: (
		channelId: string,
		tabId: string,
	) => Promise<{
		elements: ReadableElementRecord[];
	}>;
	getSelection: (
		browserId: string,
		windowId: string,
		tabId: string,
	) => Promise<Selection>;
	hitEnterOnCoordinates: (
		browserId: string,
		windowId: string,
		tabId: string,
		x: number,
		y: number,
	) => Promise<void>;
	hitEnterOnElement: (
		browserId: string,
		windowId: string,
		tabId: string,
		readablePath: string,
	) => Promise<void>;
	invokeJsFn: (
		browserId: string,
		windowId: string,
		tabId: string,
		fnBodyCode: string,
	) => Promise<unknown>;
	openTab: (
		browserId: string,
		windowId: string,
		url: string,
	) => Promise<{
		browserId: string;
		windowId: string;
		tabId: string;
	}>;
	scrollPage: (
		browserId: string,
		windowId: string,
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	) => Promise<void>;
	showHumanHint: (
		browserId: string,
		windowId: string,
		tabId: string,
		params: ShowHumanHintParams,
	) => Promise<HumanHintResponse>;
};
export const ServerToolCallsInputPort = Symbol.for("ServerToolCallsInputPort");

export type ServerToolName = keyof ServerToolCallsInputPort;

type TabRef = {
	browserId: string;
	windowId: string;
	tabId: string;
};

export type ServerToolArgsMap = {
	captureTab: TabRef;
	clickOnCoordinates: TabRef & {
		x: number;
		y: number;
	};
	clickOnElement: TabRef & {
		readablePath: string;
	};
	closeTab: TabRef;
	fillTextToCoordinates: TabRef & {
		x: number;
		y: number;
		value: string;
	};
	fillTextToElement: TabRef & {
		readablePath: string;
		value: string;
	};
	getContext: Record<string, never>;
	getReadableTextByChannelAndTab: {
		channelId: string;
		tabId: string;
	};
	getReadableElementsByChannelAndTab: {
		channelId: string;
		tabId: string;
	};
	getSelection: TabRef;
	hitEnterOnCoordinates: TabRef & {
		x: number;
		y: number;
	};
	hitEnterOnElement: TabRef & {
		readablePath: string;
	};
	invokeJsFn: TabRef & {
		fnBodyCode: string;
	};
	openTab: {
		browserId: string;
		windowId: string;
		url: string;
	};
	scrollPage: TabRef & {
		direction: ScrollDirection;
		amount?: number;
	};
	showHumanHint: TabRef & {
		action: ShowHumanHintParams["action"];
		message: string;
		value?: string;
		readablePath?: string;
		x?: number;
		y?: number;
	};
};

export type ServerToolArgs<T extends ServerToolName> = ServerToolArgsMap[T];

export type ServerToolResult<T extends ServerToolName> = Awaited<
	ReturnType<ServerToolCallsInputPort[T]>
>;
