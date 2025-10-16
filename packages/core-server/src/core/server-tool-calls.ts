import type {
	ExtensionContext,
	ExtensionTabInfo,
	ExtensionToolCallInputPort,
	ExtensionWindowInfo,
	ReadableElementRecord,
	Screenshot,
} from "@mcp-browser-kit/core-extension";
import type {
	MessageChannelRpcClient,
	TreeNode,
} from "@mcp-browser-kit/core-utils";
import { inject, injectable } from "inversify";
import type { JSDOM } from "jsdom";
import Lru from "quick-lru";

export interface TabContext {
	html: string;
	jsdom: JSDOM;
	domTree: TreeNode<globalThis.Element>;
	readableTree: TreeNode<globalThis.Element> | undefined;
}

import type {
	BrowserContext,
	BrowserTabContext,
	BrowserWindowContext,
	Context,
	ServerToolCallsInputPort,
} from "../input-ports";
import { LoggerFactoryOutputPort } from "../output-ports";
import { TabKey, WindowKey } from "../utils";
import { ExtensionChannelManager } from "./extension-channel-manager";

@injectable()
export class ToolCallUseCases implements ServerToolCallsInputPort {
	private readonly logger;
	private readonly tabContextCache = new Lru<string, TabContext>({
		maxSize: 100,
	});

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(ExtensionChannelManager)
		private readonly extensionChannelManager: ExtensionChannelManager,
	) {
		this.logger = loggerFactory.create("RpcCallUseCase");
	}

	getContext = async (): Promise<Context> => {
		this.logger.verbose("Getting browser context");

		try {
			const rpcClients = this.extensionChannelManager.getRpcClients();
			this.logger.verbose("Found RPC clients", {
				rpcClients,
			});

			if (rpcClients.length === 0) {
				this.logger.warn("No RPC clients available");
				return {
					browsers: [],
				};
			}

			const browsers = await this.getBrowserContextsFromClients(rpcClients);
			this.logger.verbose("Found browsers", {
				browsers,
			});

			return {
				browsers,
			};
		} catch (error) {
			this.logger.error("Failed to get context", error);
			throw error;
		}
	};

	private getBrowserContextsFromClients = async (
		rpcClients: MessageChannelRpcClient<ExtensionToolCallInputPort>[],
	): Promise<BrowserContext[]> => {
		const browsers: BrowserContext[] = [];

		for (let i = 0; i < rpcClients.length; i++) {
			const rpcClient = rpcClients[i];

			try {
				this.logger.verbose("Getting extension context from RPC client", {
					rpcClient,
				});
				const extensionContext = await rpcClient.call({
					method: "getExtensionContext",
					args: [],
					extraArgs: {},
				});

				this.logger.info("Retrieved extension context", {
					browserId: extensionContext.browserId,
					browser: `${extensionContext.browserInfo.browserName} ${extensionContext.browserInfo.browserVersion}`,
					tabs: extensionContext.availableTabs.length,
				});

				const browserContext = this.buildBrowserContext(extensionContext);
				browsers.push(browserContext);
			} catch (error) {
				this.logger.error("Failed to get context from RPC client", error);
			}
		}

		return browsers;
	};

	private buildBrowserContext = (
		extensionContext: ExtensionContext,
	): BrowserContext => {
		const windowsMap = this.groupTabsByWindow(extensionContext);
		const browserWindows = this.buildBrowserWindows(windowsMap);

		return {
			browserId: extensionContext.browserId,
			availableTools: extensionContext.availableTools,
			browserWindows,
		};
	};

	private groupTabsByWindow = (
		extensionContext: ExtensionContext,
	): Map<string, BrowserTabContext[]> => {
		const windowsMap = new Map<string, BrowserTabContext[]>();

		for (const tab of extensionContext.availableTabs) {
			const window = this.findWindowForTab(extensionContext);
			if (!window) continue;

			const windowKey = this.createWindowKey(
				extensionContext.browserId,
				window.id,
			);
			const browserTab = this.createBrowserTabContext(
				extensionContext.browserId,
				window.id,
				tab,
			);

			if (!windowsMap.has(windowKey)) {
				windowsMap.set(windowKey, []);
			}
			windowsMap.get(windowKey)?.push(browserTab);
		}

		return windowsMap;
	};

	private findWindowForTab = (
		extensionContext: ExtensionContext,
	): ExtensionWindowInfo | undefined => {
		// This is a simplification - you may need different logic to associate tabs with windows
		return (
			extensionContext.availableWindows.find(() => true) ||
			extensionContext.availableWindows[0]
		);
	};

	private createWindowKey = (instanceId: string, windowId: string): string => {
		return WindowKey.from({
			extensionId: instanceId,
			windowId,
		}).toString();
	};

	private createBrowserTabContext = (
		instanceId: string,
		windowId: string,
		tab: ExtensionTabInfo,
	): BrowserTabContext => {
		const tabKey = TabKey.from({
			extensionId: instanceId,
			windowId,
			tabId: tab.id,
		}).toString();

		return {
			tabKey,
			active: tab.active,
			title: tab.title,
			url: tab.url,
		};
	};

	private buildBrowserWindows = (
		windowsMap: Map<string, BrowserTabContext[]>,
	): BrowserWindowContext[] => {
		return Array.from(windowsMap.entries()).map(([windowKey, tabs]) => ({
			windowKey,
			tabs,
		}));
	};

	openTab = async (
		windowKey: string,
		url: string,
	): Promise<{
		tabKey: string;
		windowKey: string;
	}> => {
		this.logger.info(`Opening tab with URL: ${url} in window: ${windowKey}`);

		try {
			// Parse the windowKey to get windowId and instanceId
			const windowData = WindowKey.parse(windowKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				windowData.extensionId,
			);

			const result = await rpcClient.call({
				method: "openTab",
				args: [
					url,
					windowData.windowId,
				],
				extraArgs: {},
			});

			this.logger.info("Tab opened successfully", result);

			// Create tab key from the result
			const tabKey = TabKey.from({
				extensionId: windowData.extensionId,
				windowId: result.windowId,
				tabId: result.tabId,
			}).toString();

			return {
				tabKey,
				windowKey,
			};
		} catch (error) {
			this.logger.error("Failed to open tab", error);
			throw error;
		}
	};

	getReadableText = async (tabKey: string): Promise<string> => {
		this.logger.info(`Getting readable text from tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			const readableText = await rpcClient.call({
				method: "getReadableText",
				args: [
					tabData.tabId,
				],
				extraArgs: {},
			});

			this.logger.info("Retrieved readable text successfully");
			return readableText;
		} catch (error) {
			this.logger.error("Failed to get readable text", error);
			throw error;
		}
	};

	getReadableElements = async (
		tabKey: string,
	): Promise<ReadableElementRecord[]> => {
		this.logger.info(`Getting readable elements from tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			const elementRecords = await rpcClient.call({
				method: "getReadableElements",
				args: [
					tabData.tabId,
				],
				extraArgs: {},
			});

			this.logger.info(`Retrieved ${elementRecords.length} readable elements`);
			return elementRecords;
		} catch (error) {
			this.logger.error("Failed to get readable elements", error);
			throw error;
		}
	};

	clickOnElement = async (
		tabKey: string,
		readablePath: string,
	): Promise<void> => {
		this.logger.info(`Clicking on element ${readablePath} in tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "clickOnElement",
				args: [
					tabData.tabId,
					readablePath,
				],
				extraArgs: {},
			});

			this.logger.info("Element clicked successfully");
		} catch (error) {
			this.logger.error("Failed to click on element", error);
			throw error;
		}
	};

	fillTextToElement = async (
		tabKey: string,
		readablePath: string,
		value: string,
	): Promise<void> => {
		this.logger.info(
			`Filling text to element ${readablePath} in tab: ${tabKey}`,
		);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "fillTextToElement",
				args: [
					tabData.tabId,
					readablePath,
					value,
				],
				extraArgs: {},
			});

			this.logger.info("Text filled to element successfully");
		} catch (error) {
			this.logger.error("Failed to fill text to element", error);
			throw error;
		}
	};

	captureTab = async (tabKey: string): Promise<Screenshot> => {
		this.logger.info(`Capturing screenshot from tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			const screenshot = await rpcClient.call({
				method: "captureTab",
				args: [
					tabData.tabId,
				],
				extraArgs: {},
			});

			this.logger.info("Screenshot captured successfully");
			return screenshot;
		} catch (error) {
			this.logger.error("Failed to capture screenshot", error);
			throw error;
		}
	};

	clickOnCoordinates = async (
		tabKey: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.info(`Clicking on coordinates (${x}, ${y}) in tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "clickOnCoordinates",
				args: [
					tabData.tabId,
					x,
					y,
				],
				extraArgs: {},
			});

			this.logger.info("Clicked on coordinates successfully");
		} catch (error) {
			this.logger.error("Failed to click on coordinates", error);
			throw error;
		}
	};

	closeTab = async (tabKey: string): Promise<void> => {
		this.logger.info(`Closing tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "closeTab",
				args: [
					tabData.tabId,
				],
				extraArgs: {},
			});

			// Clear cached context for this tab
			this.tabContextCache.delete(tabKey);

			this.logger.info("Tab closed successfully");
		} catch (error) {
			this.logger.error("Failed to close tab", error);
			throw error;
		}
	};

	fillTextToCoordinates = async (
		tabKey: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		this.logger.info(
			`Filling text to coordinates (${x}, ${y}) in tab: ${tabKey}`,
		);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "fillTextToCoordinates",
				args: [
					tabData.tabId,
					x,
					y,
					value,
				],
				extraArgs: {},
			});

			this.logger.info("Text filled to coordinates successfully");
		} catch (error) {
			this.logger.error("Failed to fill text to coordinates", error);
			throw error;
		}
	};

	getSelection = async (
		tabKey: string,
	): Promise<import("@mcp-browser-kit/core-extension").Selection> => {
		this.logger.info(`Getting selection from tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			const selection = await rpcClient.call({
				method: "getSelection",
				args: [
					tabData.tabId,
				],
				extraArgs: {},
			});

			this.logger.info("Selection retrieved successfully");
			return selection;
		} catch (error) {
			this.logger.error("Failed to get selection", error);
			throw error;
		}
	};

	hitEnterOnCoordinates = async (
		tabKey: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.info(
			`Hitting enter on coordinates (${x}, ${y}) in tab: ${tabKey}`,
		);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "hitEnterOnCoordinates",
				args: [
					tabData.tabId,
					x,
					y,
				],
				extraArgs: {},
			});

			this.logger.info("Hit enter on coordinates successfully");
		} catch (error) {
			this.logger.error("Failed to hit enter on coordinates", error);
			throw error;
		}
	};

	hitEnterOnElement = async (
		tabKey: string,
		readablePath: string,
	): Promise<void> => {
		this.logger.info(
			`Hitting enter on element ${readablePath} in tab: ${tabKey}`,
		);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			await rpcClient.call({
				method: "hitEnterOnElement",
				args: [
					tabData.tabId,
					readablePath,
				],
				extraArgs: {},
			});

			this.logger.info("Hit enter on element successfully");
		} catch (error) {
			this.logger.error("Failed to hit enter on element", error);
			throw error;
		}
	};

	invokeJsFn = async (tabKey: string, fnBodyCode: string): Promise<unknown> => {
		this.logger.info(`Invoking JavaScript function in tab: ${tabKey}`);

		try {
			// Parse the tabKey to get tabId and instanceId
			const tabData = TabKey.parse(tabKey);

			// Get the RPC client for this browser instance
			const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
				tabData.extensionId,
			);

			const result = await rpcClient.call({
				method: "invokeJsFn",
				args: [
					tabData.tabId,
					fnBodyCode,
				],
				extraArgs: {},
			});

			this.logger.info("JavaScript function invoked successfully");
			return result;
		} catch (error) {
			this.logger.error("Failed to invoke JavaScript function", error);
			throw error;
		}
	};

	/**
	 * Gets the cached DOM tree for a tab
	 * @param tabKey - The tab key
	 * @returns The cached DOM tree or undefined if not cached
	 */
	getDomTree = (tabKey: string): TreeNode<globalThis.Element> | undefined => {
		return this.tabContextCache.get(tabKey)?.domTree;
	};

	/**
	 * Gets the cached readable tree for a tab
	 * @param tabKey - The tab key
	 * @returns The cached readable tree or undefined if not cached
	 */
	getReadableTree = (
		tabKey: string,
	): TreeNode<globalThis.Element> | undefined => {
		return this.tabContextCache.get(tabKey)?.readableTree;
	};

	/**
	 * Gets the cached tab context (JSDOM, DOM tree, and readable tree)
	 * @param tabKey - The tab key
	 * @returns The cached tab context or undefined if not cached
	 */
	getTabContext = (tabKey: string): TabContext | undefined => {
		return this.tabContextCache.get(tabKey);
	};
}
