import type {
	ExtensionContext,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type {
	ExtensionDriverOutputPort,
	Screenshot,
} from "@mcp-browser-kit/core-server";
import {
	type DeferData,
	EmitteryMessageChannel,
	MessageChannelRpcClient,
	type ResolveData,
} from "@mcp-browser-kit/utils";
import { injectable } from "inversify";
@injectable()
export class DrivenExtensionDriver implements ExtensionDriverOutputPort {
	public readonly channelRpcClient = new EmitteryMessageChannel<
		ResolveData,
		DeferData
	>();
	public readonly extensionRpcClient =
		new MessageChannelRpcClient<ExtensionDriverOutputPort>();

	start = () => {
		this.extensionRpcClient.bindChannel(this.channelRpcClient);
	};

	stop = () => {
		this.extensionRpcClient.unbindChannel();
	};

	hitEnterOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "hitEnterOnCoordinates",
			args: [
				tabId,
				x,
				y,
			],
			extraArgs: {
				tabId,
			},
		});
	};
	hitEnterOnElement = (tabId: string, selector: string): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "hitEnterOnElement",
			args: [
				tabId,
				selector,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	captureTab = (tabId: string): Promise<Screenshot> => {
		return this.extensionRpcClient.call({
			method: "captureTab",
			args: [
				tabId,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	clickOnCoordinates = (tabId: string, x: number, y: number): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "clickOnCoordinates",
			args: [
				tabId,
				x,
				y,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	fillTextToCoordinates = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "fillTextToCoordinates",
			args: [
				tabId,
				x,
				y,
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	clickOnElement = (tabId: string, selector: string): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "clickOnElement",
			args: [
				tabId,
				selector,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	fillTextToElement = (
		tabId: string,
		selector: string,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "fillTextToElement",
			args: [
				tabId,
				selector,
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.extensionRpcClient.call({
			method: "invokeJsFn",
			args: [
				tabId,
				fnBodyCode,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	getExtensionContext = (): Promise<ExtensionContext> => {
		return this.extensionRpcClient.call({
			method: "getExtensionContext",
			args: [],
			extraArgs: {},
		});
	};

	openTab = (
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}> => {
		return this.extensionRpcClient.call({
			method: "openTab",
			args: [
				url,
				windowId,
			],
			extraArgs: {
				windowId,
			},
		});
	};

	closeTab = (tabId: string): Promise<void> => {
		return this.extensionRpcClient.call({
			method: "closeTab",
			args: [
				tabId,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	getSelection = (tabId: string): Promise<Selection> => {
		return this.extensionRpcClient.call({
			method: "getSelection",
			args: [
				tabId,
			],
			extraArgs: {
				tabId,
			},
		});
	};
}
