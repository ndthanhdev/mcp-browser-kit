import type {
	BrowserDriverOutputPort,
	ReadableElement,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-server";
import { injectable } from "inversify";
import { createBrowserRpcClient } from "./browser-rpc-client";

@injectable()
export class DrivenBrowserDriver implements BrowserDriverOutputPort {
	public readonly browserRpcClient = createBrowserRpcClient();

	captureActiveTab(): Promise<Screenshot> {
		return this.browserRpcClient.defer("captureActiveTab");
	}

	getInnerText(tabId: string): Promise<string> {
		return this.browserRpcClient.defer("getInnerText", tabId);
	}

	getReadableElements(tabId: string): Promise<ReadableElement[]> {
		return this.browserRpcClient.defer("getReadableElements", tabId);
	}

	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void> {
		return this.browserRpcClient.defer("clickOnViewableElement", tabId, x, y);
	}

	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> {
		return this.browserRpcClient.defer(
			"fillTextToViewableElement",
			tabId,
			x,
			y,
			value,
		);
	}

	clickOnReadableElement(tabId: string, index: number): Promise<void> {
		return this.browserRpcClient.defer("clickOnReadableElement", tabId, index);
	}

	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void> {
		return this.browserRpcClient.defer(
			"fillTextToReadableElement",
			tabId,
			index,
			value,
		);
	}

	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return this.browserRpcClient.defer("invokeJsFn", tabId, fnBodyCode);
	}

	getTabs(): Promise<Tab[]> {
		return this.browserRpcClient.defer("getTabs");
	}
}
