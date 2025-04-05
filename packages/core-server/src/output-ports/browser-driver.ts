import type { Tab } from "../entities/tab";
import type { Screenshot } from "../input-ports/capture-active-tab";
import type { ReadableElement } from "../input-ports/get-readable-elements";

export interface BrowserDriverOutputPort {
	getTabs(): Promise<Tab[]>;
	captureActiveTab(): Promise<Screenshot>;
	getInnerText(tabId: string): Promise<string>;
	getReadableElements(tabId: string): Promise<ReadableElement[]>;
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
