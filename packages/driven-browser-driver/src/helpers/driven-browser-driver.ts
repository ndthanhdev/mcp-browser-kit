import type {
	ReadableElement,
	Screenshot,
	Tab,
} from "@mcp-browser-kit/browser-extension/entities";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as userActions from "../utils/user-actions";

@injectable()
export class DrivenBrowserDriver implements BrowserDriverOutputPort {
	getTabs(): Promise<Tab[]> {
		return userActions.getTabs();
	}
	captureActiveTab(): Promise<Screenshot> {
		return userActions.captureActiveTab();
	}
	getInnerText(tabId: string): Promise<string> {
		return userActions.getInnerText(tabId);
	}
	getReadableElements(tabId: string): Promise<ReadableElement[]> {
		return userActions.getReadableElements(tabId);
	}
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void> {
		return userActions.clickOnViewableElement(tabId, x, y);
	}
	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> {
		return userActions.fillTextToViewableElement(tabId, x, y, value);
	}
	clickOnReadableElement(tabId: string, index: number): Promise<void> {
		return userActions.clickOnReadableElement(tabId, index);
	}
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void> {
		return userActions.fillTextToReadableElement(tabId, index, value);
	}
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return userActions.invokeJsFn(tabId, fnBodyCode);
	}
}
