import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
	TabContext,
} from "@mcp-browser-kit/core-extension";
import type {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type { Func } from "@mcp-browser-kit/types";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import * as backgroundToolsM2 from "../utils/background-tools-m2";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";
import { TabDomTools } from "./tab-dom-tools";
import type { TabRpcService } from "./tab-rpc-service";
import { TabRpcService as TabRpcServiceClass } from "./tab-rpc-service";
import { TabTools } from "./tab-tools";
import { TabToolsSetup } from "./tab-tools-setup";

@injectable()
export class DrivenBrowserDriverM2 implements BrowserDriverOutputPort {
	/**
	 * Setup container bindings for M2 environment - includes tab services and M2 driver
	 */
	static setupContainer(container: Container): void {
		// Tab services
		container.bind<TabTools>(TabTools).to(TabTools);
		container.bind<TabDomTools>(TabDomTools).to(TabDomTools);
		container.bind<TabAnimationTools>(TabAnimationTools).to(TabAnimationTools);
		container.bind<TabContextStore>(TabContextStore).to(TabContextStore);
		container.bind<TabToolsSetup>(TabToolsSetup).to(TabToolsSetup);

		// M2 browser driver
		container
			.bind<TabRpcServiceClass>(TabRpcServiceClass)
			.to(TabRpcServiceClass);
		container
			.bind<DrivenBrowserDriverM2>(DrivenBrowserDriverM2)
			.to(DrivenBrowserDriverM2);
	}

	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabRpcServiceClass)
		private readonly tabRpcService: TabRpcService,
	) {
		this.logger = this.loggerFactory.create("DrivenBrowserDriverM2");
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
	getSelection = (tabId: string): Promise<Selection> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.getSelection",
			args: [],
			extraArgs: {
				tabId,
			},
		});
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

	clickOnElementByReadablePath = (
		tabId: string,
		readablePath: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnElementByReadablePath",
			args: [
				readablePath,
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
	fillTextToElementByReadablePath = (
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToElementByReadablePath",
			args: [
				readablePath,
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

	hitEnterOnElementByReadablePath = (
		tabId: string,
		readablePath: string,
	): Promise<void> => {
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnElementByReadablePath",
			args: [
				readablePath,
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
	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return backgroundToolsM2.invokeJsFn(tabId, fnBodyCode);
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
