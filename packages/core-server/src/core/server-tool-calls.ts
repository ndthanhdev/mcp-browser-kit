import type {
	ExtensionContext,
	ExtensionTabInfo,
	ExtensionToolCallInputPort,
	ExtensionWindowInfo,
	ReadableElementRecord,
	Screenshot,
	TabSpecificTool,
} from "@mcp-browser-kit/core-extension";
import type { MessageChannelRpcClient } from "@mcp-browser-kit/core-utils";
import { isBrowserInternalUrl } from "@mcp-browser-kit/core-utils";
import { inject, injectable } from "inversify";
import Lru from "quick-lru";

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
	private readonly tabContextCache = new Lru<string, BrowserTabContext>({
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
				this.logger.error("No browser connected");
				throw new Error(
					"No browser connected. Please make sure you have installed a suitable browser extension version and that it is enabled.",
				);
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

		this.updateTabContextCache(browsers);

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

	/**
	 * Sets the tab context cache with browser tab context information.
	 * Creates or updates cache entries for all tabs with their basic information
	 * (tabKey, active status, title, and URL).
	 * @param browsers - Array of browser contexts to extract tab information from
	 */
	private updateTabContextCache = (browsers: BrowserContext[]): void => {
		let createdCount = 0;
		let updatedCount = 0;

		this.logger.verbose(`Start updating cache for ${browsers.length} browsers`);

		for (const browser of browsers) {
			for (const window of browser.browserWindows) {
				for (const tab of window.tabs) {
					const existingContext = this.tabContextCache.get(tab.tabKey);

					this.tabContextCache.set(tab.tabKey, tab);
					this.logger.verbose(`Updating ${tab.tabKey}: ${tab.url}`);
					if (existingContext) {
						// Update existing entry with latest tab information
						// Create new cache entry with tab information
						updatedCount++;
					} else {
						// Create new cache entry with tab information
						createdCount++;
					}
				}
			}
		}

		this.logger.verbose(
			`Tab context cache: created ${createdCount}, updated ${updatedCount} entries`,
		);
	};

	private callRpcForTab = (async ({ method, args, extraArgs }) => {
		const [tabKey, ...restArgs] = args;

		// Ensure the tab is not an internal browser page before proceeding
		await this.ensureNotAnInternalBrowserPage(tabKey);

		const tabData = TabKey.parse(tabKey);
		const rpcClient = this.extensionChannelManager.getRpcClientByBrowserId(
			tabData.extensionId,
		) as MessageChannelRpcClient<TabSpecificTool>;

		return rpcClient.call({
			method,
			args: [
				tabData.tabId,
				...restArgs,
			] as typeof args,
			extraArgs,
		});
	}) as MessageChannelRpcClient<TabSpecificTool>["call"];

	/**
	 * Ensures that the tab is not an internal browser page.
	 * Checks the URL from cache first, then falls back to fetching from extension context.
	 * @param tabKey - The tab key to check
	 * @throws Error if the tab is an internal browser page
	 */
	private ensureNotAnInternalBrowserPage = async (
		tabKey: string,
	): Promise<void> => {
		this.logger.verbose(`Checking if tab is internal browser page: ${tabKey}`);

		// First, check if we have the URL in cache
		const cachedContext = this.tabContextCache.get(tabKey);
		if (cachedContext?.url) {
			if (isBrowserInternalUrl(cachedContext.url)) {
				this.logger.warn(
					`Tab ${tabKey} is an internal browser page: ${cachedContext.url}`,
				);
				throw new Error(
					`Cannot perform operation on internal browser page: ${cachedContext.url}`,
				);
			}
			return;
		}

		// If not in cache, get it from extension context
		try {
			const context = await this.getContext();
			for (const browser of context.browsers) {
				for (const window of browser.browserWindows) {
					const tab = window.tabs.find((t) => t.tabKey === tabKey);
					if (tab) {
						if (isBrowserInternalUrl(tab.url)) {
							this.logger.warn(
								`Tab ${tabKey} is an internal browser page: ${tab.url}`,
							);
							throw new Error(
								`Cannot perform operation on internal browser page: ${tab.url}`,
							);
						}
						return;
					}
				}
			}

			// Tab not found
			this.logger.warn(`Tab not found: ${tabKey}`);
			throw new Error(`Tab not found: ${tabKey}`);
		} catch (error) {
			this.logger.error(
				"Failed to check if tab is internal browser page",
				error,
			);
			throw error;
		}
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
			const readableText = await this.callRpcForTab({
				method: "getReadableText" as const,
				args: [
					tabKey,
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
			const elementRecords = await this.callRpcForTab({
				method: "getReadableElements" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "clickOnElement" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "fillTextToElement" as const,
				args: [
					tabKey,
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
			const screenshot = await this.callRpcForTab({
				method: "captureTab" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "clickOnCoordinates" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "closeTab" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "fillTextToCoordinates" as const,
				args: [
					tabKey,
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
			const selection = await this.callRpcForTab({
				method: "getSelection" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "hitEnterOnCoordinates" as const,
				args: [
					tabKey,
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
			await this.callRpcForTab({
				method: "hitEnterOnElement" as const,
				args: [
					tabKey,
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
			const result = await this.callRpcForTab({
				method: "invokeJsFn" as const,
				args: [
					tabKey,
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
	 * Gets the cached browser tab context for a tab
	 * @param tabKey - The tab key
	 * @returns The cached browser tab context or undefined if not cached
	 */
	getTabContext = (tabKey: string): BrowserTabContext | undefined => {
		return this.tabContextCache.get(tabKey);
	};
}
