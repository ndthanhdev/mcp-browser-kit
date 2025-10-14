import { inject, injectable } from "inversify";
import type { ExtensionToolCallInputPort } from "../input-ports";
import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";
import type {
	ExtensionContext,
	ExtensionToolName,
	Screenshot,
	Selection,
} from "../types";

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
	hitEnterOnCoordinates = async (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		await this.browserDriver.focusOnCoordinates(tabId, x, y);
		return this.browserDriver.hitEnterOnFocusedElement(tabId);
	};
	hitEnterOnElement = (tabId: string, readablePath: string): Promise<void> => {
		return this.browserDriver.hitEnterOnElementBySelector(tabId, readablePath);
	};

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

	getSelection = (tabId: string): Promise<Selection> => {
		return this.browserDriver.getSelection(tabId);
	};

	clickOnCoordinates = (tabId: string, x: number, y: number): Promise<void> => {
		return this.browserDriver.clickOnCoordinates(tabId, x, y);
	};

	fillTextToCoordinates = async (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		await this.browserDriver.focusOnCoordinates(tabId, x, y);
		return this.browserDriver.fillTextToFocusedElement(tabId, value);
	};

	clickOnElement = (tabId: string, readablePath: string): Promise<void> => {
		return this.browserDriver.clickOnElementBySelector(tabId, readablePath);
	};

	fillTextToElement = (
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<void> => {
		return this.browserDriver.fillTextToElementBySelector(
			tabId,
			readablePath,
			value,
		);
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
}
