import type {
	ElementRecord,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as backgroundTools from "../utils/background-tools";
import { executeContentToolM3 } from "../utils/execute-content-tool";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
	getTabs = (): Promise<Tab[]> => {
		return backgroundTools.getTabs();
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return backgroundTools.captureActiveTab();
	};

	getInnerText = (tabId: string): Promise<string> => {
		return executeContentToolM3(tabId, "dom.getInnerText");
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
