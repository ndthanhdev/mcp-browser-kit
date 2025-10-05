import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import * as backgroundToolsM2 from "../utils/background-tools-m2";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import type { TabRpcService } from "./tab-rpc-service";

@injectable()
export class DrivenBrowserDriverM2 implements BrowserDriverOutputPort {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		private readonly tabRpcService: TabRpcService,
	) {
		this.logger = this.loggerFactory.create("DrivenBrowserDriverM2");
	}

	captureTab(tabId: string): Promise<Screenshot> {
		return backgroundToolsM3.captureTab(tabId);
	}

	clickOnCoordinates(tabId: string, x: number, y: number): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnCoordinates",
			args: [
				x,
				y,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	clickOnElementBySelector(tabId: string, selector: string): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnElementBySelector",
			args: [
				selector,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	closeTab = async (tabId: string): Promise<void> => {
		this.logger.info(`Closing tab with ID: ${tabId}`);
		await backgroundToolsM3.closeTab(tabId);
		this.logger.info(`Tab closed: ${tabId}`);
	};

	fillTextToElementBySelector(
		tabId: string,
		selector: string,
		value: string,
	): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToElementBySelector",
			args: [
				selector,
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	fillTextToFocusedElement(tabId: string, value: string): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToFocusedElement",
			args: [
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	focusOnCoordinates(tabId: string, x: number, y: number): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.focusOnCoordinates",
			args: [
				x,
				y,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	getBrowserInfo(): Promise<BrowserInfo> {
		return backgroundToolsM3.getBrowserInfo();
	}

	getExtensionInfo(): Promise<ExtensionInfo> {
		return backgroundToolsM3.getExtensionInfo();
	}

	getBrowserId(): Promise<string> {
		return backgroundToolsM3.getBrowserId();
	}

	getSelection(_tabId: string): Promise<Selection> {
		throw new Error("Method not implemented.");
	}

	getTabs(): Promise<ExtensionTabInfo[]> {
		return backgroundToolsM3.getTabs();
	}

	getWindows(): Promise<ExtensionWindowInfo[]> {
		return backgroundToolsM3.getWindows();
	}

	hitEnterOnElementBySelector(tabId: string, selector: string): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnElementBySelector",
			args: [
				selector,
			],
			extraArgs: {
				tabId,
			},
		});
	}

	hitEnterOnFocusedElement(tabId: string): Promise<void> {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnFocusedElement",
			args: [],
			extraArgs: {
				tabId,
			},
		});
	}

	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return backgroundToolsM2.invokeJsFn(tabId, fnBodyCode);
	}

	openTab = async (
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}> => {
		this.logger.info(`Opening tab with URL: ${url} in window: ${windowId}`);
		const result = await backgroundToolsM3.openTab(url, windowId);
		this.logger.info(`Tab opened with ID: ${result.tabId}`);
		return result;
	};
}
