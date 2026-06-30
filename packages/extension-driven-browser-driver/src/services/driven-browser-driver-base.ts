import type {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	ScrollDirection,
	Selection,
	TabContext,
} from "@mcp-browser-kit/core-extension/types";
import type {
	Func,
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import type { TabRpcService } from "./tab-rpc-service";

/**
 * Shared implementation for the M2 and M3 browser drivers. The two manifest
 * versions are identical except for `captureTab` and `invokeJsFn` (which rely
 * on MV2-only background APIs), so those are left `abstract` for the subclasses
 * to provide. Everything else — tab RPC delegation, browser/extension info,
 * DOM interaction, and RPC lifecycle — lives here.
 *
 * This is an internal implementation detail: subclasses own the DI wiring
 * (`@injectable` + `setupContainer`); the base is never bound directly.
 */
export abstract class DrivenBrowserDriverBase
	implements BrowserDriverOutputPort
{
	protected readonly logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		loggerFactory: LoggerFactoryOutputPort,
		protected readonly tabRpcService: TabRpcService,
		loggerName: string,
	) {
		this.logger = loggerFactory.create(loggerName);
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

	/** MV2-only: capture the visible tab. Not supported in MV3. */
	abstract captureTab: (tabId: string) => Promise<Screenshot>;

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

	// Scroll Methods
	scrollPage = (
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<void> => {
		this.logger.verbose(
			`Scrolling ${direction}${amount != null ? ` by ${amount}px` : ""} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.scrollPage",
			args: [
				direction,
				amount,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	scrollElement = (
		tabId: string,
		readableTreePath: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<void> => {
		this.logger.verbose(
			`Scrolling element ${readableTreePath} ${direction}${amount != null ? ` by ${amount}px` : ""} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.scrollElement",
			args: [
				readableTreePath,
				direction,
				amount,
			],
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
		readableTreePath: string,
	): Promise<void> => {
		this.logger.verbose(
			`Clicking on element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnElementByReadablePath",
			args: [
				readableTreePath,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	getElementHtmlByReadablePath = (
		tabId: string,
		readablePath: string,
	): Promise<string> => {
		this.logger.verbose(
			`Getting element HTML by readable path: ${readablePath} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.getElementHtmlByReadablePath",
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
		readableTreePath: string,
		value: string,
	): Promise<void> => {
		this.logger.verbose(
			`Filling text to element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToElementByReadablePath",
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
		readableTreePath: string,
	): Promise<void> => {
		this.logger.verbose(
			`Hitting enter on element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnElementByReadablePath",
			args: [
				readableTreePath,
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

	showHumanHint = async (
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> => {
		this.logger.verbose(`Showing human hint in tab: ${tabId}`);
		await backgroundToolsM3.activateTab(tabId);
		return this.tabRpcService.tabRpcClient.call({
			method: "showHumanHint",
			args: [
				params,
				humanMessage,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	// JavaScript Execution Methods
	/** MV2-only: run a function in the page. Not supported in MV3. */
	abstract invokeJsFn: (tabId: string, fnBodyCode: string) => Promise<unknown>;

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
