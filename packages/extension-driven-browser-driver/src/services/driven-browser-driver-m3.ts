import type {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
	TabContext,
} from "@mcp-browser-kit/core-extension/types";
import type { Func } from "@mcp-browser-kit/types";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";
import { TabDomTools } from "./tab-dom-tools";
import { TabRpcService } from "./tab-rpc-service";
import { TabTools } from "./tab-tools";
import { TabToolsSetup } from "./tab-tools-setup";

@injectable()
export class DrivenBrowserDriverM3 implements BrowserDriverOutputPort {
	/**
	 * Setup container bindings for M3 environment - includes tab services and M3 driver
	 */
	static setupContainer(container: Container): void {
		// Tab services
		container.bind<TabTools>(TabTools).to(TabTools);
		container.bind<TabDomTools>(TabDomTools).to(TabDomTools);
		container.bind<TabAnimationTools>(TabAnimationTools).to(TabAnimationTools);
		container.bind<TabContextStore>(TabContextStore).to(TabContextStore);
		container.bind<TabToolsSetup>(TabToolsSetup).to(TabToolsSetup);

		// M3 browser driver services
		container.bind<TabRpcService>(TabRpcService).to(TabRpcService);
		container
			.bind<DrivenBrowserDriverM3>(DrivenBrowserDriverM3)
			.to(DrivenBrowserDriverM3);
	}

	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabRpcService)
		private readonly tabRpcService: TabRpcService,
	) {
		this.logger = this.loggerFactory.create("DrivenBrowserDriverM3");
	}

	loadTabContext = (tabId: string): Promise<TabContext> => {
		this.logger.verbose(`Loading tab context for tab: ${tabId}`);
		return this.tabRpcService.tabRpcClient.call({
			method: "loadTabContext",
			args: [],
			extraArgs: {
				tabId,
			},
		});
	};

	// Browser and Extension Info Methods
	getBrowserInfo = (): Promise<BrowserInfo> => {
		return backgroundToolsM3.getBrowserInfo();
	};

	getExtensionInfo = (): Promise<ExtensionInfo> => {
		return backgroundToolsM3.getExtensionInfo();
	};

	getBrowserId = (): Promise<string> => {
		return backgroundToolsM3.getBrowserId();
	};

	// Tab Management Methods
	getTabs = (): Promise<ExtensionTabInfo[]> => {
		return backgroundToolsM3.getTabs();
	};

	getWindows = async (): Promise<ExtensionWindowInfo[]> => {
		return backgroundToolsM3.getWindows();
	};

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

	closeTab = async (tabId: string): Promise<void> => {
		this.logger.info(`Closing tab with ID: ${tabId}`);
		await backgroundToolsM3.closeTab(tabId);
		this.logger.info(`Tab closed: ${tabId}`);
	};

	captureTab = (tabId: string): Promise<Screenshot> => {
		return backgroundToolsM3.captureTab(tabId);
	};

	// DOM Query Methods
	getSelection = (_tabId: string): Promise<Selection> => {
		return Promise.reject("getSelection is not supported in M3 driver");
	};

	// Interaction Methods (Click/Focus)
	clickOnCoordinates = (tabId: string, x: number, y: number): Promise<void> => {
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
	};

	clickOnElementBySelector = (
		tabId: string,
		readableTreePath: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnElementBySelector",
			args: [
				readableTreePath,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	focusOnCoordinates = (tabId: string, x: number, y: number): Promise<void> => {
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
	};

	// Input Methods
	fillTextToElementBySelector = (
		tabId: string,
		readableTreePath: string,
		value: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToElementBySelector",
			args: [
				readableTreePath,
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	fillTextToFocusedElement = (tabId: string, value: string): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToFocusedElement",
			args: [
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	hitEnterOnElementBySelector = (
		tabId: string,
		readableTreePath: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnElementBySelector",
			args: [
				readableTreePath,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	hitEnterOnFocusedElement = (tabId: string): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnFocusedElement",
			args: [],
			extraArgs: {
				tabId,
			},
		});
	};

	// JavaScript Execution Methods
	invokeJsFn = (_tabId: string, _fnBodyCode: string): Promise<unknown> => {
		return Promise.reject("invokeJsFn is not supported");
	};

	// RPC Communication Methods
	linkRpc = (): Func => {
		this.logger.info("Linking RPC communication");
		const unlinkFn = this.tabRpcService.linkRpc();
		this.logger.info("RPC communication linked successfully");
		return unlinkFn;
	};

	unlinkRpc = (): void => {
		this.logger.info("Unlinking RPC communication");
		this.tabRpcService.unlinkRpc();
		this.logger.info("RPC communication unlinked");
	};

	handleTabMessage = (message: unknown): void => {
		this.logger.verbose("Handling tab message");
		this.tabRpcService.handleTabMessage(message);
	};
}
