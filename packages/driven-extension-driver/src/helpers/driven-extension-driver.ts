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
		return this.extensionRpcClient.defer({
			method: "hitEnterOnViewableElement",
			args: [tabId, x, y],
		});
	};
	hitEnterOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionRpcClient.defer({
			method: "hitEnterOnReadableElement",
			args: [tabId, index],
		});
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return this.extensionRpcClient.defer({
			method: "captureActiveTab",
			args: [],
		});
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.extensionRpcClient.defer({
			method: "getInnerText",
			args: [tabId],
		});
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		return this.extensionRpcClient.defer({
			method: "getReadableElements",
			args: [tabId],
		});
	};

	clickOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionRpcClient.defer({
			method: "clickOnViewableElement",
			args: [tabId, x, y],
		});
	};

	fillTextToViewableElement = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.defer({
			method: "fillTextToViewableElement",
			args: [tabId, x, y, value],
		});
	};

	clickOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionRpcClient.defer({
			method: "clickOnReadableElement",
			args: [tabId, index],
		});
	};

	fillTextToReadableElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		return this.extensionRpcClient.defer({
			method: "fillTextToReadableElement",
			args: [tabId, index, value],
		});
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.extensionRpcClient.defer({
			method: "invokeJsFn",
			args: [tabId, fnBodyCode],
		});
	};

	getBasicBrowserContext = (): Promise<Tab[]> => {
		return this.extensionRpcClient.defer({
			method: "getTabs",
			args: [],
		});
	};
}
