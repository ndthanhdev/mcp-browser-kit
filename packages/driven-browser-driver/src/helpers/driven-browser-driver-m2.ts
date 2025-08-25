import type {
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { injectable } from "inversify";
import * as backgroundToolsM2 from "../utils/background-tools-m2";
import * as backgroundToolsM3 from "../utils/background-tools-m3";

@injectable()
export class DrivenBrowserDriverM2 implements BrowserDriverOutputPort {
	getWindows(): Promise<ExtensionWindowInfo[]> {
		throw new Error("Method not implemented.");
	}
	getExtensionInfo(): Promise<ExtensionInfo> {
		throw new Error("Method not implemented.");
	}
	openTab(
		_url: string,
		_windowId: string
	): Promise<{ tabId: string; windowId: string }> {
		throw new Error("Method not implemented.");
	}
	closeTab(_tabId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	captureTab(_tabId: string): Promise<Screenshot> {
		throw new Error("Method not implemented.");
	}
	getHtml(_tabId: string): Promise<string> {
		throw new Error("Method not implemented.");
	}
	getSelection(_tabId: string): Promise<Selection> {
		throw new Error("Method not implemented.");
	}
	focusOnCoordinates(_tabId: string, _x: number, _y: number): Promise<void> {
		throw new Error("Method not implemented.");
	}
	fillTextToFocusedElement(_tabId: string, _value: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	hitEnterOnFocusedElement(_tabId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	clickOnElementBySelector(_tabId: string, _selector: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	fillTextToElementBySelector(
		_tabId: string,
		_selector: string,
		_value: string
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	hitEnterOnElementBySelector(
		_tabId: string,
		_selector: string
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	getTabs(): Promise<ExtensionTabInfo[]> {
		return backgroundToolsM3.getTabs();
	}
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return backgroundToolsM2.invokeJsFn(tabId, fnBodyCode);
	}
	clickOnCoordinates(_tabId: string, _x: number, _y: number): Promise<void> {
		return Promise.reject("clickOnCoordinates is not supported in M2 driver");
	}
}
