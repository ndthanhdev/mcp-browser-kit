import type {
	ElementRecord,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as backgroundTools from "../utils/background-tools";
import { createRpcClientM3 } from "./create-content-script-rpc-m3";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
	public readonly extensionRpcClient = createRpcClientM3();

	getTabs = (): Promise<Tab[]> => {
		return backgroundTools.getTabs();
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return backgroundTools.captureActiveTab();
	};

	getInnerText = (tabId: string): Promise<string> => {
		const task = this.extensionRpcClient.defer("dom.getInnerText");

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
