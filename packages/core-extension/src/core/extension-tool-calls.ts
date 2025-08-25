import { inject, injectable } from "inversify";
import type { ExtensionToolCallsInputPort } from "../input-ports";
import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";
import type {
	ElementRecord,
	ExtensionContext,
	ExtensionToolName,
	Screenshot,
	Selection,
} from "../types";

@injectable()
export class ExtensionToolsUseCase implements ExtensionToolCallsInputPort {
	private readonly logger;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort
	) {
		this.logger = this.loggerFactory.create("ExtensionToolsUseCase");
	}
	hitEnterOnCoordinates = async (
		tabId: string,
		x: number,
		y: number
	): Promise<void> => {
		await this.browserDriver.focusOnCoordinates(tabId, x, y);
		return this.browserDriver.hitEnterOnFocusedElement(tabId);
	};
	hitEnterOnElement = (tabId: string, selector: string): Promise<void> => {
		return this.browserDriver.hitEnterOnElementBySelector(tabId, selector);
	};

	getExtensionContext = async (): Promise<ExtensionContext> => {
		this.logger.verbose("getExtensionContext");

		const [availableTabs, availableWindows, extensionInfo] = await Promise.all([
			this.browserDriver.getTabs(),
			this.browserDriver.getWindows(),
			this.browserDriver.getExtensionInfo(),
		]);

		this.logger.verbose("getExtensionContext - got all context data");

		// Get all available tool names from the ExtensionTools interface
		const availableTools: ExtensionToolName[] = [];

		this.logger.info("getExtensionContext - completed", {
			availableTabs,
			availableWindows,
			extensionInfo,
			availableToolsCount: availableTools.length,
		});

		return {
			availableTabs,
			availableWindows,
			availableTools,
			extensionInfo,
		};
	};

	openTab = (
		url: string,
		windowId: string
	): Promise<{ tabId: string; windowId: string }> => {
		return this.browserDriver.openTab(url, windowId);
	};

	closeTab = (tabId: string): Promise<void> => {
		return this.browserDriver.closeTab(tabId);
	};

	captureTab = (tabId: string): Promise<Screenshot> => {
		return this.browserDriver.captureTab(tabId);
	};

	getHtml = (tabId: string): Promise<string> => {
		return this.browserDriver.getHtml(tabId);
	};

	getSelection = (tabId: string): Promise<Selection> => {
		return this.browserDriver.getSelection(tabId);
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.browserDriver.getInnerText(tabId);
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		return this.browserDriver.getReadableElements(tabId);
	};

	clickOnCoordinates = (tabId: string, x: number, y: number): Promise<void> => {
		return this.browserDriver.clickOnViewableElement(tabId, x, y);
	};

	fillTextToCoordinates = async (
		tabId: string,
		x: number,
		y: number,
		value: string
	): Promise<void> => {
		await this.browserDriver.focusOnCoordinates(tabId, x, y);
		return this.browserDriver.fillTextToFocusedElement(tabId, value);
	};

	clickOnElement = (tabId: string, selector: string): Promise<void> => {
		return this.browserDriver.clickOnElementBySelector(tabId, selector);
	};

	fillTextToElement = (
		tabId: string,
		selector: string,
		value: string
	): Promise<void> => {
		return this.browserDriver.fillTextToElementBySelector(
			tabId,
			selector,
			value
		);
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.browserDriver.invokeJsFn(tabId, fnBodyCode);
	};
}
