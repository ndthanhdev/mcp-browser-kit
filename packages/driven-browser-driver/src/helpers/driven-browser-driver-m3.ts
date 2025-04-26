import type {
	ElementRecord,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as backgroundTools from "../utils/background-tools";
import { createM3TabRpcClient } from "./create-rpc-m3";
import type { DeferMessage } from "@mcp-browser-kit/rpc";
import type { Merge } from "type-fest";
import type { Func } from "@mcp-browser-kit/types";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
	public readonly tabRpcClient = createM3TabRpcClient();

	handleTabMessage = () => {};

	private _unlink: Func | undefined;
	unlinkRpc = () => {
		browser.runtime.onMessage.removeListener(this.handleTabMessage);
		this._unlink?.();
	};

	linkRpc = () => {
		this.unlinkRpc();
		browser.runtime.onMessage.addListener(this.handleTabMessage);
		this._unlink = this.tabRpcClient.onDefer<
			Merge<
				DeferMessage,
				{
					tabId: string;
				}
			>
		>(async (message) => {
			await browser.tabs.sendMessage(+message.tabId, message);
		});

		return this._unlink;
	};

	getTabs = (): Promise<Tab[]> => {
		return backgroundTools.getTabs();
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return backgroundTools.captureActiveTab();
	};

	getInnerText = (tabId: string): Promise<string> => {
		const task = this.tabRpcClient.defer({
			method: "dom.getInnerText",
			args: [],
			tabId: tabId,
		});

		return task;
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		throw new Error("Method not implemented.");
	};

	clickOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	fillTextToViewableElement = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	hitEnterOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	clickOnReadableElement = (tabId: string, index: number): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	fillTextToReadableElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	hitEnterOnReadableElement = (tabId: string, index: number): Promise<void> => {
		throw new Error("Method not implemented.");
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		throw new Error("Method not implemented.");
	};
}
