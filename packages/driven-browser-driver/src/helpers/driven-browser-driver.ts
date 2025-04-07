import type {
	ElementRecord,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/core-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as backgroundTools from "../utils/background-tools";
import { executeContentTool } from "../utils/execute-content-tool";

@injectable()
export class DrivenBrowserDriver implements BrowserDriverOutputPort {
	getTabs(): Promise<Tab[]> {
		return backgroundTools.getTabs();
	}
	captureActiveTab(): Promise<Screenshot> {
		return backgroundTools.captureActiveTab();
	}
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return backgroundTools.invokeJsFn(tabId, fnBodyCode);
	}
	getInnerText(tabId: string): Promise<string> {
		return executeContentTool(tabId, "dom.getInnerText");
	}
	getReadableElements(tabId: string): Promise<ElementRecord[]> {
		return executeContentTool(tabId, "dom.getReadableElements");
	}
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void> {
		return executeContentTool(tabId, "dom.clickOnViewableElement", x, y);
	}
	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> {
		return executeContentTool(
			tabId,
			"dom.fillTextToViewableElement",
			x,
			y,
			value,
		);
	}
	clickOnReadableElement(tabId: string, index: number): Promise<void> {
		return executeContentTool(tabId, "dom.clickOnReadableElement", index);
	}
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void> {
		return executeContentTool(
			tabId,
			"dom.fillTextToReadableElement",
			index,
			value,
		);
	}
}
