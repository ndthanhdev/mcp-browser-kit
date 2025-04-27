import type { ExtensionToolCallsInputPort } from "@mcp-browser-kit/core-extension";

// ToolsInputPort - Combined interface for all RPC calls
export interface ToolCallsInputPort extends ExtensionToolCallsInputPort {
	// GetTabs
	getBasicBrowserContextInstruction(): string;

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

	// HitEnterOnViewableElement
	hitEnterOnViewableElementInstruction(): string;

	// ClickOnReadableElement
	clickOnReadableElementInstruction(): string;

	// FillTextToReadableElement
	fillTextToReadableElementInstruction(): string;

	// HitEnterOnReadableElement
	hitEnterOnReadableElementInstruction(): string;

	// InvokeJsFn
	invokeJsFnInstruction(): string;
}
export const ToolsInputPort = Symbol.for("ToolsInputPort");
