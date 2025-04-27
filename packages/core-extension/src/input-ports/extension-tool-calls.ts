import type { ElementRecord, Screenshot, Tab } from "../entities";

export interface BasicBrowserContext {
	tabs: Tab[];
	manifestVersion: number;
}

export interface ExtensionToolCallsInputPort {
	getBasicBrowserContext(): Promise<BasicBrowserContext>;
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
export const ExtensionToolCallsInputPort = Symbol.for(
	"ExtensionToolCallsInputPort",
);
