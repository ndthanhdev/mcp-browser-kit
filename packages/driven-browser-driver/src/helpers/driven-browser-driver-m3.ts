import type {
	ElementRecord,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import type { DeferMessage, ResolveMessage } from "@mcp-browser-kit/rpc";
import type { Func } from "@mcp-browser-kit/types";
import { injectable } from "inversify";
import type { Merge } from "type-fest";
import browser from "webextension-polyfill";
import * as backgroundTools from "../utils/background-tools";
import { createM3TabRpcClient } from "./create-m3-tab-rpc";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
	getManifestVersion(): Promise<number> {
		return Promise.resolve(3);
	}
	public readonly tabRpcClient = createM3TabRpcClient();

	handleTabMessage = (message: unknown) => {
		this.tabRpcClient.emitter.emit("resolve", message as ResolveMessage);
	};

	private _unlink: Func | undefined;
	unlinkRpc = () => {
		// browser.runtime.onMessage.removeListener(this.handleTabMessage);
		this._unlink?.();
	};

	linkRpc = () => {
		this.unlinkRpc();
		// browser.runtime.onMessage.addListener(this.handleTabMessage);
		this._unlink = this.tabRpcClient.onDefer<
			Merge<
				DeferMessage,
				{
					tabId: string;
				}
			>
		>(async (message) => {
			const response = await browser.tabs.sendMessage(+message.tabId, message);
			this.handleTabMessage(response);
		});

		return this._unlink;
	};

	getTabs = (): Promise<Tab[]> => {
		return backgroundTools.getTabs();
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return Promise.reject("captureActiveTab is not supported");
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
		return this.tabRpcClient.defer({
			method: "dom.getReadableElements",
			args: [],
			tabId,
		});
	};

	clickOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.clickOnViewableElement",
			args: [x, y],
			tabId,
		});
	};

	fillTextToViewableElement = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.fillTextToViewableElement",
			args: [x, y, value],
			tabId,
		});
	};

	hitEnterOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.hitEnterOnViewableElement",
			args: [x, y],
			tabId,
		});
	};

	clickOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.clickOnReadableElement",
			args: [index],
			tabId,
		});
	};

	fillTextToReadableElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.fillTextToReadableElement",
			args: [index, value],
			tabId,
		});
	};

	hitEnterOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.tabRpcClient.defer({
			method: "dom.hitEnterOnReadableElement",
			args: [index],
			tabId,
		});
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return Promise.reject("invokeJsFn is not supported");
	};
}
