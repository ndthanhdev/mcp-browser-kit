import type {
	ExtensionContext,
	ExtensionTabInfo,
	ExtensionToolCallInputPort,
	ExtensionWindowInfo,
	ReadableElementRecord,
	Screenshot,
	ScrollDirection,
	TabSpecificTool,
} from "@mcp-browser-kit/core-extension";
import type { MessageChannelRpcClient } from "@mcp-browser-kit/core-utils";
import {
	isBrowserInternalUrl,
	shortChannelId,
} from "@mcp-browser-kit/core-utils";
import type {
	HumanHintResponse,
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import { HUMAN_HINT_EXPIRES_IN_SECONDS } from "@mcp-browser-kit/types";
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
import {
	buildHumanMessage,
	targetFromParams,
	validateShowHumanHintParams,
} from "../utils/build-human-message";
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
			const rpcClientEntries =
				this.extensionChannelManager.getRpcClientEntries();
			this.logger.verbose("Found RPC clients", {
				count: rpcClientEntries.length,
			});

			if (rpcClientEntries.length === 0) {
				this.logger.error("No browser connected");
				throw new Error(
					"No browser connected. Please make sure you have installed a suitable browser extension version and that it is enabled.",
				);
			}

			const browsers =
				await this.getBrowserContextsFromClients(rpcClientEntries);
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
		rpcClientEntries: Array<
			[
				string,
				MessageChannelRpcClient<ExtensionToolCallInputPort>,
			]
		>,
	): Promise<BrowserContext[]> => {
		const browsers: BrowserContext[] = [];

		for (const [channelId, rpcClient] of rpcClientEntries) {
			try {
				this.logger.verbose("Getting extension context from RPC client", {
					channelId,
				});
				const extensionContext = await rpcClient.call({
					method: "getExtensionContext",
					args: [],
					extraArgs: {},
				});

				this.logger.info("Retrieved extension context", {
					browserId: shortChannelId(channelId),
					browser: `${extensionContext.browserInfo.browserName} ${extensionContext.browserInfo.browserVersion}`,
					tabs: extensionContext.availableTabs.length,
				});

				const browserContext = this.buildBrowserContext(
					channelId,
					extensionContext,
				);
				browsers.push(browserContext);
			} catch (error) {
				this.logger.error("Failed to get context from RPC client", error);
			}
		}

		this.updateTabContextCache(browsers);

		return browsers;
	};

	private buildBrowserContext = (
		channelId: string,
		extensionContext: ExtensionContext,
	): BrowserContext => {
		const windowsMap = this.groupTabsByWindow(extensionContext);
		const browserWindows = this.buildBrowserWindows(windowsMap);

		return {
			browserId: shortChannelId(channelId),
			availableTools: extensionContext.availableTools,
			browserWindows,
		};
	};

	private groupTabsByWindow = (
		extensionContext: ExtensionContext,
	): Map<string, BrowserTabContext[]> => {
		const windowsMap = new Map<string, BrowserTabContext[]>();

		for (const tab of extensionContext.availableTabs) {
			const window = this.findWindowForTab(extensionContext, tab);
			if (!window) continue;

			const browserTab: BrowserTabContext = {
				windowId: window.id,
				tabId: tab.id,
				active: tab.active,
				title: tab.title,
				url: tab.url,
			};

			if (!windowsMap.has(window.id)) {
				windowsMap.set(window.id, []);
			}
			windowsMap.get(window.id)?.push(browserTab);
		}

		return windowsMap;
	};

	private findWindowForTab = (
		extensionContext: ExtensionContext,
		tab: ExtensionTabInfo,
	): ExtensionWindowInfo | undefined => {
		return (
			extensionContext.availableWindows.find((w) => w.id === tab.windowId) ||
			extensionContext.availableWindows[0]
		);
	};

	private buildBrowserWindows = (
		windowsMap: Map<string, BrowserTabContext[]>,
	): BrowserWindowContext[] => {
		return Array.from(windowsMap.entries()).map(([windowId, tabs]) => ({
			windowId,
			tabs,
		}));
	};

	private tabCacheKey = (browserId: string, tabId: string): string =>
		`${browserId}::${tabId}`;

	/**
	 * Sets the tab context cache with browser tab context information.
	 * Creates or updates cache entries for all tabs with their basic information
	 * (active status, title, and URL), keyed by browserId + tabId.
	 * @param browsers - Array of browser contexts to extract tab information from
	 */
	private updateTabContextCache = (browsers: BrowserContext[]): void => {
		let createdCount = 0;
		let updatedCount = 0;

		this.logger.verbose(`Start updating cache for ${browsers.length} browsers`);

		for (const browser of browsers) {
			for (const window of browser.browserWindows) {
				for (const tab of window.tabs) {
					const cacheKey = this.tabCacheKey(browser.browserId, tab.tabId);
					const existingContext = this.tabContextCache.get(cacheKey);

					this.tabContextCache.set(cacheKey, tab);
					this.logger.verbose(`Updating ${cacheKey}: ${tab.url}`);
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

	/**
	 * Resolves the RPC client for a tab and guards against internal browser
	 * pages before any tab operation.
	 * @param browserId - The short channel id identifying the browser
	 * @param tabId - The native tab id
	 */
	private getTabRpc = async (
		browserId: string,
		tabId: string,
	): Promise<MessageChannelRpcClient<TabSpecificTool>> => {
		await this.ensureNotAnInternalBrowserPage(browserId, tabId);

		return this.extensionChannelManager.getRpcClientByBrowserId(
			browserId,
		) as unknown as MessageChannelRpcClient<TabSpecificTool>;
	};

	/**
	 * Ensures that the tab is not an internal browser page.
	 * Checks the URL from cache first, then falls back to fetching from extension context.
	 * @param browserId - The short channel id identifying the browser
	 * @param tabId - The native tab id
	 * @throws Error if the tab is an internal browser page
	 */
	private ensureNotAnInternalBrowserPage = async (
		browserId: string,
		tabId: string,
	): Promise<void> => {
		const cacheKey = this.tabCacheKey(browserId, tabId);
		this.logger.verbose(
			`Checking if tab is internal browser page: ${cacheKey}`,
		);

		// First, check if we have the URL in cache
		const cachedContext = this.tabContextCache.get(cacheKey);
		if (cachedContext?.url) {
			if (isBrowserInternalUrl(cachedContext.url)) {
				this.logger.warn(
					`Tab ${cacheKey} is an internal browser page: ${cachedContext.url}`,
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
				if (browser.browserId !== browserId) continue;
				for (const window of browser.browserWindows) {
					const tab = window.tabs.find((t) => t.tabId === tabId);
					if (tab) {
						if (isBrowserInternalUrl(tab.url)) {
							this.logger.warn(
								`Tab ${cacheKey} is an internal browser page: ${tab.url}`,
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
			this.logger.warn(`Tab not found: ${cacheKey}`);
			throw new Error(`Tab not found: ${cacheKey}`);
		} catch (error) {
			this.logger.error(
				"Failed to check if tab is internal browser page",
				error,
			);
			throw error;
		}
	};

	openTab = async (
		browserId: string,
		windowId: string,
		url: string,
	): Promise<{
		browserId: string;
		windowId: string;
		tabId: string;
	}> => {
		this.logger.info(
			`Opening tab with URL: ${url} in window: ${browserId}/${windowId}`,
		);

		try {
			const rpcClient =
				this.extensionChannelManager.getRpcClientByBrowserId(browserId);

			const result = await rpcClient.call({
				method: "openTab",
				args: [
					url,
					windowId,
				],
				extraArgs: {},
			});

			this.logger.info("Tab opened successfully", result);

			return {
				browserId,
				windowId: result.windowId,
				tabId: result.tabId,
			};
		} catch (error) {
			this.logger.error("Failed to open tab", error);
			throw error;
		}
	};

	getReadableTextByChannelAndTab = async (
		channelId: string,
		tabId: string,
	): Promise<string> => {
		this.logger.info(
			`Getting readable text from channel: ${channelId}, tab: ${tabId}`,
		);

		const rpcClient =
			this.extensionChannelManager.getRpcClientByChannelId(channelId);
		if (!rpcClient) {
			throw new Error(`No active channel for: ${channelId}`);
		}

		try {
			const readableText = await rpcClient.call({
				method: "getReadableText" as const,
				args: [
					tabId,
				],
				extraArgs: {},
			});
			this.logger.info("Retrieved readable text successfully");
			return readableText;
		} catch (error) {
			this.logger.error(
				"Failed to get readable text by channel and tab",
				error,
			);
			throw error;
		}
	};

	getReadableElementsByChannelAndTab = async (
		channelId: string,
		tabId: string,
	): Promise<{
		elements: ReadableElementRecord[];
	}> => {
		this.logger.info(
			`Getting readable elements from channel: ${channelId}, tab: ${tabId}`,
		);

		const rpcClient =
			this.extensionChannelManager.getRpcClientByChannelId(channelId);
		if (!rpcClient) {
			throw new Error(`No active channel for: ${channelId}`);
		}

		try {
			const elementRecords = await rpcClient.call({
				method: "getReadableElements" as const,
				args: [
					tabId,
				],
				extraArgs: {},
			});
			this.logger.info(`Retrieved ${elementRecords.length} readable elements`);
			return {
				elements: elementRecords,
			};
		} catch (error) {
			this.logger.error(
				"Failed to get readable elements by channel and tab",
				error,
			);
			throw error;
		}
	};

	clickOnElement = async (
		browserId: string,
		_windowId: string,
		tabId: string,
		readablePath: string,
	): Promise<void> => {
		this.logger.info(
			`Clicking on element ${readablePath} in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "clickOnElement" as const,
				args: [
					tabId,
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
		browserId: string,
		_windowId: string,
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<void> => {
		this.logger.info(
			`Filling text to element ${readablePath} in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "fillTextToElement" as const,
				args: [
					tabId,
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

	captureTab = async (
		browserId: string,
		_windowId: string,
		tabId: string,
	): Promise<Screenshot> => {
		this.logger.info(`Capturing screenshot from tab: ${browserId}/${tabId}`);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			const screenshot = await rpcClient.call({
				method: "captureTab" as const,
				args: [
					tabId,
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
		browserId: string,
		_windowId: string,
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.info(
			`Clicking on coordinates (${x}, ${y}) in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "clickOnCoordinates" as const,
				args: [
					tabId,
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

	scrollPage = async (
		browserId: string,
		_windowId: string,
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<void> => {
		this.logger.info(
			`Scrolling ${direction}${amount != null ? ` by ${amount}px` : ""} in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "scrollPage" as const,
				args: [
					tabId,
					direction,
					amount,
				],
				extraArgs: {},
			});

			this.logger.info("Scrolled page successfully");
		} catch (error) {
			this.logger.error("Failed to scroll page", error);
			throw error;
		}
	};

	closeTab = async (
		browserId: string,
		_windowId: string,
		tabId: string,
	): Promise<void> => {
		this.logger.info(`Closing tab: ${browserId}/${tabId}`);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "closeTab" as const,
				args: [
					tabId,
				],
				extraArgs: {},
			});

			// Clear cached context for this tab
			this.tabContextCache.delete(this.tabCacheKey(browserId, tabId));

			this.logger.info("Tab closed successfully");
		} catch (error) {
			this.logger.error("Failed to close tab", error);
			throw error;
		}
	};

	fillTextToCoordinates = async (
		browserId: string,
		_windowId: string,
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		this.logger.info(
			`Filling text to coordinates (${x}, ${y}) in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "fillTextToCoordinates" as const,
				args: [
					tabId,
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
		browserId: string,
		_windowId: string,
		tabId: string,
	): Promise<import("@mcp-browser-kit/core-extension").Selection> => {
		this.logger.info(`Getting selection from tab: ${browserId}/${tabId}`);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			const selection = await rpcClient.call({
				method: "getSelection" as const,
				args: [
					tabId,
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
		browserId: string,
		_windowId: string,
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.info(
			`Hitting enter on coordinates (${x}, ${y}) in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "hitEnterOnCoordinates" as const,
				args: [
					tabId,
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
		browserId: string,
		_windowId: string,
		tabId: string,
		readablePath: string,
	): Promise<void> => {
		this.logger.info(
			`Hitting enter on element ${readablePath} in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			await rpcClient.call({
				method: "hitEnterOnElement" as const,
				args: [
					tabId,
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

	invokeJsFn = async (
		browserId: string,
		_windowId: string,
		tabId: string,
		fnBodyCode: string,
	): Promise<unknown> => {
		this.logger.info(
			`Invoking JavaScript function in tab: ${browserId}/${tabId}`,
		);

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);
			const result = await rpcClient.call({
				method: "invokeJsFn" as const,
				args: [
					tabId,
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

	showHumanHint = async (
		browserId: string,
		_windowId: string,
		tabId: string,
		params: ShowHumanHintParams,
	): Promise<HumanHintResponse> => {
		this.logger.info("Showing human hint", {
			browserId,
			tabId,
			action: params.action,
		});

		const tab = await this.resolveTabInfo(browserId, tabId);
		const humanMessage = buildHumanMessage(
			params.action,
			params.message,
			params.value,
		);

		const validationError = validateShowHumanHintParams(params);
		if (validationError) {
			return {
				ok: false,
				reason: validationError,
				action: params.action,
				target: targetFromParams(params),
				value: params.value,
				message: params.message,
				humanMessage,
				tab,
				expiresInSeconds: HUMAN_HINT_EXPIRES_IN_SECONDS,
			};
		}

		try {
			const rpcClient = await this.getTabRpc(browserId, tabId);

			const tabResult = (await rpcClient.call({
				method: "showHumanHint",
				args: [
					tabId,
					params,
					humanMessage,
				],
				extraArgs: {},
			})) as HumanHintTabResult;

			return {
				ok: tabResult.ok,
				reason: tabResult.reason,
				action: params.action,
				target: tabResult.target ?? targetFromParams(params),
				value: params.value,
				message: params.message,
				humanMessage,
				tab,
				expiresInSeconds: HUMAN_HINT_EXPIRES_IN_SECONDS,
			};
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.logger.error("Failed to show human hint", {
				browserId,
				tabId,
				reason,
			});
			return {
				ok: false,
				reason,
				action: params.action,
				target: targetFromParams(params),
				value: params.value,
				message: params.message,
				humanMessage,
				tab,
				expiresInSeconds: HUMAN_HINT_EXPIRES_IN_SECONDS,
			};
		}
	};

	private resolveTabInfo = async (
		browserId: string,
		tabId: string,
	): Promise<{
		title: string;
		url: string;
	}> => {
		const cached = this.tabContextCache.get(this.tabCacheKey(browserId, tabId));
		if (cached)
			return {
				title: cached.title,
				url: cached.url,
			};

		try {
			const context = await this.getContext();
			for (const browser of context.browsers) {
				if (browser.browserId !== browserId) continue;
				for (const window of browser.browserWindows) {
					const tab = window.tabs.find((t) => t.tabId === tabId);
					if (tab)
						return {
							title: tab.title,
							url: tab.url,
						};
				}
			}
		} catch {
			this.logger.warn("Failed to resolve tab info for human hint");
		}

		return {
			title: "",
			url: "",
		};
	};
}
