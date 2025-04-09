import type {
	ElementRecord,
	ExtensionDriverOutputPort,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-server";
import { injectable } from "inversify";
import { createExtensionRpcClient } from "../utils/extension-rpc-client";

@injectable()
export class DrivenExtensionDriver implements ExtensionDriverOutputPort {
	public readonly extensionRpcClient = createExtensionRpcClient();

	hitEnterOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionRpcClient.defer(
			"hitEnterOnViewableElement",
			tabId,
			x,
			y,
		);
	};
	hitEnterOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionRpcClient.defer(
			"hitEnterOnReadableElement",
			tabId,
			index,
		);
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return this.extensionRpcClient.defer("captureActiveTab");
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.extensionRpcClient.defer("getInnerText", tabId);
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		return this.extensionRpcClient.defer("getReadableElements", tabId);
	};

	clickOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionRpcClient.defer("clickOnViewableElement", tabId, x, y);
	};

	fillTextToViewableElement = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.defer(
			"fillTextToViewableElement",
			tabId,
			x,
			y,
			value,
		);
	};

	clickOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionRpcClient.defer(
			"clickOnReadableElement",
			tabId,
			index,
		);
	};

	fillTextToReadableElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.defer(
			"fillTextToReadableElement",
			tabId,
			index,
			value,
		);
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.extensionRpcClient.defer("invokeJsFn", tabId, fnBodyCode);
	};

	getTabs = (): Promise<Tab[]> => {
		return this.extensionRpcClient.defer("getTabs");
	};
}
