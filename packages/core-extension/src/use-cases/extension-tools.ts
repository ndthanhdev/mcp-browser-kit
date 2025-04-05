import { inject, injectable } from "inversify";
import type { ExtensionToolsInputPort } from "../input-ports";
import type { Tab, Screenshot, ReadableElement } from "../entities";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class ExtensionToolsUseCase implements ExtensionToolsInputPort {
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	getTabs = (): Promise<Tab[]> => {
		return this.browserDriver.getTabs();
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return this.browserDriver.captureActiveTab();
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.browserDriver.getInnerText(tabId);
	};

	getReadableElements = (tabId: string): Promise<ReadableElement[]> => {
		return this.browserDriver.getReadableElements(tabId);
	};

	clickOnViewableElement = (tabId: string, x: number, y: number): Promise<void> => {
		return this.browserDriver.clickOnViewableElement(tabId, x, y);
	};

	fillTextToViewableElement = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.browserDriver.fillTextToViewableElement(tabId, x, y, value);
	};

	clickOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.browserDriver.clickOnReadableElement(tabId, index);
	};

	fillTextToReadableElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		return this.browserDriver.fillTextToReadableElement(tabId, index, value);
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.browserDriver.invokeJsFn(tabId, fnBodyCode);
	};
}
