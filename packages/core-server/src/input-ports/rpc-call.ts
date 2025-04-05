import type { Tab } from "../entities";
import type { Screenshot } from "../entities";
import type { ReadableElement } from "../entities";

// RpcCallInputPort - Combined interface for all RPC calls
export interface RpcCallInputPort {
	// GetTabs
	getTabsInstruction(): string;
	getTabs(): Promise<Tab[]>;

	// CaptureActiveTab
	captureActiveTabInstruction(): string;
	captureActiveTab(): Promise<Screenshot>;

	// GetInnerText
	getInnerTextInstruction(): string;
	getInnerText(tabId: string): Promise<string>;

	// GetReadableElements
	getReadableElementsInstruction(): string;
	getReadableElements(tabId: string): Promise<ReadableElement[]>;

	// ClickOnViewableElement
	clickOnViewableElementInstruction(): string;
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void>;

	// FillTextToViewableElement
	fillTextToViewableElementInstruction(): string;
	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void>;

	// ClickOnReadableElement
	clickOnReadableElementInstruction(): string;
	clickOnReadableElement(tabId: string, index: number): Promise<void>;

	// FillTextToReadableElement
	fillTextToReadableElementInstruction(): string;
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void>;

	// InvokeJsFn
	invokeJsFnInstruction(): string;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}
export const RpcCallInputPort = Symbol("RpcCallInputPort");
