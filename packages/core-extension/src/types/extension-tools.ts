import type { BasicBrowserContext } from "./browser-context";
import type { ElementRecord } from "./element-record";
import type { Screenshot } from "./screenshot";

export interface ExtensionTools {
	getBasicBrowserContext(): Promise<BasicBrowserContext | string>;
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
	hitEnterOnViewableElement(tabId: string, x: number, y: number): Promise<void>;
	clickOnReadableElement(tabId: string, index: number): Promise<void>;
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void>;
	hitEnterOnReadableElement(tabId: string, index: number): Promise<void>;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}
