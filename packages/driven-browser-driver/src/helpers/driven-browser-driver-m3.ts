import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
} from "@mcp-browser-kit/core-extension/types";
import type { DeferMessage, ResolveMessage } from "@mcp-browser-kit/rpc";
import type { Func } from "@mcp-browser-kit/types";
import { injectable } from "inversify";
import type { Merge } from "type-fest";
import browser from "webextension-polyfill";
import * as backgroundTools from "../utils/background-tools-m3";
import { createM3TabRpcClient } from "./create-m3-tab-rpc";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
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

	getTabs = (): Promise<ExtensionTabInfo[]> => {
		return backgroundTools.getTabs();
	};

	captureTab = (_tabId: string): Promise<Screenshot> => {
		return Promise.reject("captureTab is not supported");
	};

	clickOnCoordinates = (
		_tabId: string,
		_x: number,
		_y: number
	): Promise<void> => {
		return Promise.reject("clickOnCoordinates is not supported in M3 driver");
	};

	fillTextToFocusedElement(_tabId: string, _value: string): Promise<void> {
		return Promise.reject(
			"fillTextToFocusedElement is not supported in M3 driver"
		);
	}

	invokeJsFn = (_tabId: string, _fnBodyCode: string): Promise<unknown> => {
		return Promise.reject("invokeJsFn is not supported");
	};

	getWindows = async (): Promise<ExtensionWindowInfo[]> => {
		const windows = await browser.windows.getAll();
		return windows.map((window) => ({
			id: window.id?.toString() ?? "",
			focused: window.focused ?? false,
		}));
	};

	getExtensionInfo = async (): Promise<ExtensionInfo> => {
		const manifest = browser.runtime.getManifest();
		return {
			id: browser.runtime.id ?? "",
			version: manifest.version ?? "",
			manifestVersion: manifest.manifest_version ?? 3,
		};
	};

	openTab = async (
		url: string,
		windowId: string
	): Promise<{ tabId: string; windowId: string }> => {
		const tab = await browser.tabs.create({
			url,
			windowId: Number.parseInt(windowId),
		});
		return {
			tabId: tab.id?.toString() ?? "",
			windowId: tab.windowId?.toString() ?? "",
		};
	};

	closeTab = async (tabId: string): Promise<void> => {
		await browser.tabs.remove(Number.parseInt(tabId));
	};

	getHtml = (_tabId: string): Promise<string> => {
		return Promise.reject("getHtml is not supported in M3 driver");
	};

	getSelection = (_tabId: string): Promise<Selection> => {
		return Promise.reject("getSelection is not supported in M3 driver");
	};

	focusOnCoordinates = (
		_tabId: string,
		_x: number,
		_y: number
	): Promise<void> => {
		return Promise.reject("focusOnCoordinates is not supported in M3 driver");
	};

	hitEnterOnFocusedElement = (_tabId: string): Promise<void> => {
		return Promise.reject(
			"hitEnterOnFocusedElement is not supported in M3 driver"
		);
	};

	clickOnElementBySelector = (
		_tabId: string,
		_selector: string
	): Promise<void> => {
		return Promise.reject(
			"clickOnElementBySelector is not supported in M3 driver"
		);
	};

	fillTextToElementBySelector = (
		_tabId: string,
		_selector: string,
		_value: string
	): Promise<void> => {
		return Promise.reject(
			"fillTextToElementBySelector is not supported in M3 driver"
		);
	};

	hitEnterOnElementBySelector = (
		_tabId: string,
		_selector: string
	): Promise<void> => {
		return Promise.reject(
			"hitEnterOnElementBySelector is not supported in M3 driver"
		);
	};
}
