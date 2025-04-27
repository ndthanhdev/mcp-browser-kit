import { inject, injectable } from "inversify";
import type { ElementRecord, Screenshot, Tab } from "../entities";
import type {
	BasicBrowserContext,
	ExtensionToolCallsInputPort,
} from "../input-ports";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class ExtensionToolsUseCase implements ExtensionToolCallsInputPort {
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}
	hitEnterOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.browserDriver.hitEnterOnViewableElement(tabId, x, y);
	};
	hitEnterOnReadableElement = (tabId: string, index: number): Promise<void> => {
		return this.browserDriver.hitEnterOnReadableElement(tabId, index);
	};

	getBasicBrowserContext = async (): Promise<BasicBrowserContext> => {
		const tabs = await this.browserDriver.getTabs();
		const manifestVersion = await this.browserDriver.getManifestVersion();

		return {
			tabs,
			manifestVersion,
		};
	};

	captureActiveTab = (): Promise<Screenshot> => {
		return this.browserDriver.captureActiveTab();
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.browserDriver.getInnerText(tabId);
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		return this.browserDriver.getReadableElements(tabId);
	};

	clickOnViewableElement = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
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
