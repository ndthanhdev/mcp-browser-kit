import type {
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import type { ExtensionToolCallInputPort } from "../input-ports";
import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";
import type {
	ExtensionContext,
	ExtensionToolName,
	PageChange,
	PageSaveFormat,
	PageSaveResult,
	Screenshot,
	ScrollDirection,
	Selection,
} from "../types";
import { diffReadableElements } from "../utils/diff-readable-elements";

const stripHash = (url: string): string => url.split("#")[0];

@injectable()
export class ToolCallHandlersUseCase implements ExtensionToolCallInputPort {
	private readonly logger;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("ToolCallHandlersUseCase");
	}

	/**
	 * Runs a page-modifying action and reports what it changed. The "before"
	 * snapshot is not committed, so the action still resolves readablePaths
	 * against the snapshot the caller last read. If the action fails because
	 * the page navigated away mid-call, the navigation is the result, not an
	 * error.
	 */
	private withPageChange = async (
		tabId: string,
		act: () => Promise<void>,
	): Promise<PageChange> => {
		const beforeState = await this.browserDriver.waitForTabSettled(tabId);
		const before = await this.browserDriver.loadTabContext(tabId, {
			commit: false,
			animate: false,
		});

		let actError: unknown;
		try {
			await act();
		} catch (error) {
			actError = error;
		}

		const afterState = await this.browserDriver.waitForTabSettled(
			tabId,
			beforeState.documentId,
		);
		const navigated =
			afterState.documentId !== beforeState.documentId ||
			stripHash(afterState.url) !== stripHash(beforeState.url);

		if (actError !== undefined && !navigated) throw actError;

		if (navigated) {
			this.logger.info(`Action navigated tab ${tabId} to ${afterState.url}`);
			return {
				changed: true,
				navigated: true,
				url: afterState.url,
				added: 0,
				removed: 0,
				tooLarge: true,
				pathsShifted: true,
			};
		}

		const after = await this.browserDriver.loadTabContext(tabId, {
			commit: true,
			animate: false,
		});
		const diff = diffReadableElements(
			before.readableElementRecords,
			after.readableElementRecords,
		);
		return {
			...diff,
			navigated: false,
			url: afterState.url,
		};
	};

	hitEnterOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<PageChange> =>
		this.withPageChange(tabId, async () => {
			await this.browserDriver.focusOnCoordinates(tabId, x, y);
			await this.browserDriver.hitEnterOnFocusedElement(tabId);
		});

	hitEnterOnElement = (
		tabId: string,
		readablePath: string,
	): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.hitEnterOnElementByReadablePath(tabId, readablePath),
		);

	getExtensionContext = async (): Promise<ExtensionContext> => {
		this.logger.verbose("getExtensionContext");

		const [
			availableTabs,
			availableWindows,
			extensionInfo,
			instanceId,
			browserInfo,
		] = await Promise.all([
			this.browserDriver.getTabs(),
			this.browserDriver.getWindows(),
			this.browserDriver.getExtensionInfo(),
			this.browserDriver.getBrowserId(),
			this.browserDriver.getBrowserInfo(),
		]);

		this.logger.verbose("getExtensionContext - got all context data");

		// Get all available tool names from the ExtensionTools interface
		const availableTools: ExtensionToolName[] = [];

		this.logger.info("getExtensionContext - completed", {
			availableTabs,
			availableWindows,
			extensionInfo,
			instanceId,
			availableToolsCount: availableTools.length,
		});

		return {
			availableTabs,
			availableWindows,
			availableTools,
			extensionInfo,
			browserInfo,
			browserId: instanceId,
		};
	};

	openTab = (
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}> => {
		return this.browserDriver.openTab(url, windowId);
	};

	closeTab = (tabId: string): Promise<void> => {
		return this.browserDriver.closeTab(tabId);
	};

	captureTab = (tabId: string): Promise<Screenshot> => {
		return this.browserDriver.captureTab(tabId);
	};

	savePage = (
		tabId: string,
		format: PageSaveFormat,
	): Promise<PageSaveResult> => {
		return this.browserDriver.savePage(tabId, format);
	};

	getSelection = (tabId: string): Promise<Selection> => {
		return this.browserDriver.getSelection(tabId);
	};

	clickOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.clickOnCoordinates(tabId, x, y),
		);

	scrollPage = (
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.scrollPage(tabId, direction, amount),
		);

	scrollElement = (
		tabId: string,
		readablePath: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.scrollElement(tabId, readablePath, direction, amount),
		);

	fillTextToCoordinates = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<PageChange> =>
		this.withPageChange(tabId, async () => {
			await this.browserDriver.focusOnCoordinates(tabId, x, y);
			await this.browserDriver.fillTextToFocusedElement(tabId, value);
		});

	clickOnElement = (tabId: string, readablePath: string): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.clickOnElementByReadablePath(tabId, readablePath),
		);

	fillTextToElement = (
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<PageChange> =>
		this.withPageChange(tabId, () =>
			this.browserDriver.fillTextToElementByReadablePath(
				tabId,
				readablePath,
				value,
			),
		);

	showHumanHint = (
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> => {
		return this.browserDriver.showHumanHint(tabId, params, humanMessage);
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.browserDriver.invokeJsFn(tabId, fnBodyCode);
	};

	loadTabContext = (tabId: string) => {
		return this.browserDriver.loadTabContext(tabId);
	};

	getReadableElements = async (tabId: string) => {
		const tabContext = await this.browserDriver.loadTabContext(tabId);
		return tabContext.readableElementRecords;
	};

	getReadableText = async (tabId: string) => {
		this.logger.info(`Getting readable text from tab: ${tabId}`);

		try {
			const tabContext = await this.browserDriver.loadTabContext(tabId);
			this.logger.info("Retrieved readable text successfully");
			return tabContext.textContent;
		} catch (error) {
			this.logger.error("Failed to get readable text", error);
			throw error;
		}
	};

	getElementHtml = async (tabId: string, readablePath: string) => {
		this.logger.info(
			`Getting element HTML from tab: ${tabId}, path: ${readablePath}`,
		);

		try {
			const html = await this.browserDriver.getElementHtmlByReadablePath(
				tabId,
				readablePath,
			);
			this.logger.info("Retrieved element HTML successfully");
			return html;
		} catch (error) {
			this.logger.error("Failed to get element HTML", error);
			throw error;
		}
	};
}
