import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	Selection,
	TabContext,
} from "@mcp-browser-kit/core-extension";
import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { Func } from "@mcp-browser-kit/types";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import * as backgroundToolsM2 from "../utils/background-tools-m2";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import { TabRpcService } from "./tab-rpc-service";
import { TabToolsSetup } from "./tab-tools-setup";

@injectable()
export class DrivenBrowserDriverM2 implements BrowserDriverOutputPort {
	/**
	 * Setup container bindings for M2 environment
	 */
	static setupContainer(container: Container): void {
		// Setup TabRpcService and its dependencies
		container.bind<TabRpcService>(TabRpcService).to(TabRpcService);

		// M2 browser driver
		container
			.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
			.to(DrivenBrowserDriverM2);
	}

	static setupTabContainer(container: Container): void {
		TabToolsSetup.setupContainer(container);
	}

	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabRpcService)
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
		this.logger.verbose("Getting browser info");
		return backgroundToolsM3.getBrowserInfo();
	};

	getExtensionInfo = (): Promise<ExtensionInfo> => {
		this.logger.verbose("Getting extension info");
		return backgroundToolsM3.getExtensionInfo();
	};

	getBrowserId = (): Promise<string> => {
		this.logger.verbose("Getting browser ID");
		return backgroundToolsM3.getBrowserId();
	};

	// Tab Management Methods
	getTabs = (): Promise<ExtensionTabInfo[]> => {
		this.logger.verbose("Getting tabs");
		return backgroundToolsM3.getTabs();
	};

	getWindows = async (): Promise<ExtensionWindowInfo[]> => {
		this.logger.verbose("Getting windows");
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
		this.logger.verbose(`Capturing tab: ${tabId}`);
		return backgroundToolsM2.captureTab(tabId);
	};

	// DOM Query Methods
	getSelection = (tabId: string): Promise<Selection> => {
		this.logger.verbose(`Getting selection for tab: ${tabId}`);
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
		this.logger.verbose(
			`Clicking on coordinates (${x}, ${y}) in tab: ${tabId}`,
		);
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
		this.logger.verbose(
			`Clicking on element by readable path: ${readablePath} in tab: ${tabId}`,
		);
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
		this.logger.verbose(
			`Focusing on coordinates (${x}, ${y}) in tab: ${tabId}`,
		);
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
		this.logger.verbose(
			`Filling text to element by readable path: ${readablePath} in tab: ${tabId}`,
		);
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
		this.logger.verbose(`Filling text to focused element in tab: ${tabId}`);
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
		this.logger.verbose(
			`Hitting enter on element by readable path: ${readablePath} in tab: ${tabId}`,
		);
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
		this.logger.verbose(`Hitting enter on focused element in tab: ${tabId}`);
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
		this.logger.verbose(`Invoking JS function in tab: ${tabId}`);
		return backgroundToolsM2.invokeJsFn(tabId, fnBodyCode);
	};

	// RPC Communication Methods
	linkRpc = (): Func => {
		this.logger.verbose("Linking RPC communication");
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
