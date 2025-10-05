/**
 * Interface for tool descriptions input port
 */
export interface ToolDescriptionsInputPort {
	// GetTabs
	getBasicBrowserContextInstruction(): string;

	// CaptureActiveTab
	captureActiveTabInstruction(): string;

	// GetReadableText
	getReadableTextInstruction(): string;

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

export const ToolDescriptionsInputPort = Symbol.for(
	"ToolDescriptionsInputPort",
);
