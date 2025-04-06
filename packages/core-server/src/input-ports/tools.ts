import type { ExtensionToolsInputPort } from "@mcp-browser-kit/core-extension";

// ToolsInputPort - Combined interface for all RPC calls
export interface ToolsInputPort extends ExtensionToolsInputPort {
	// GetTabs
	getTabsInstruction(): string;

	// CaptureActiveTab
	captureActiveTabInstruction(): string;

	// GetInnerText
	getInnerTextInstruction(): string;

	// GetReadableElements
	getReadableElementsInstruction(): string;

	// ClickOnViewableElement
	clickOnViewableElementInstruction(): string;

	// FillTextToViewableElement
	fillTextToViewableElementInstruction(): string;

	// ClickOnReadableElement
	clickOnReadableElementInstruction(): string;

	// FillTextToReadableElement
	fillTextToReadableElementInstruction(): string;

	// InvokeJsFn
	invokeJsFnInstruction(): string;
}
export const ToolsInputPort = Symbol.for("ToolsInputPort");
