/**
 * Interface for tool descriptions input port
 */
export interface ToolDescriptionsInputPort {
	// GetTabs
	getBasicBrowserContextInstruction(): string;

	// CaptureTab
	captureTabInstruction(): string;

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

	// CloseTab
	closeTabInstruction(): string;

	// GetSelection
	getSelectionInstruction(): string;

	// OpenTab
	openTabInstruction(): string;
}

export const ToolDescriptionsInputPort = Symbol.for(
	"ToolDescriptionsInputPort",
);
