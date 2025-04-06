import type { ElementRecord, Screenshot } from "../entities";
import type { Tab } from "../entities/tab";

export interface BrowserDriverOutputPort {
	getTabs(): Promise<Tab[]>;
	captureActiveTab(): Promise<Screenshot>;
	getInnerText(tabId: string): Promise<string>;
	getReadableElements(tabId: string): Promise<ElementRecord[]>;
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void>;
	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void>;
	clickOnReadableElement(tabId: string, index: number): Promise<void>;
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}

export const BrowserDriverOutputPort = Symbol("BrowserDriverOutputPort");
