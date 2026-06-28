export interface McpDescriptionsInputPort {
	// Server-level instructions (passed to McpServer constructor)
	serverInstructions(): string;

	// Tool descriptions
	captureTabInstruction(): string;
	clickOnViewableElementInstruction(): string;
	fillTextToViewableElementInstruction(): string;
	hitEnterOnViewableElementInstruction(): string;
	clickOnReadableElementInstruction(): string;
	fillTextToReadableElementInstruction(): string;
	hitEnterOnReadableElementInstruction(): string;
	invokeJsFnInstruction(): string;
	scrollPageInstruction(): string;
	closeTabInstruction(): string;
	getSelectionInstruction(): string;
	openTabInstruction(): string;
	showHumanHintInstruction(): string;

	// Fallback tool descriptions (for clients without resource support)
	getContextInstruction(): string;
	getReadableTextInstruction(): string;
	getReadableElementsInstruction(): string;
	getReadableElementHtmlInstruction(): string;
	getSnapshotPageInstruction(): string;

	// Resource descriptions
	contextResourceDescription(): string;
	bkResourceTemplateDescription(): string;
	browserResourceDescription(
		tabCount: number,
		windowCount: number,
		shortId: string,
	): string;
	tabResourceDescription(
		url: string,
		browserName: string,
		active: boolean,
	): string;
	tabReadableTextDescription(tabId: string): string;
	tabReadableElementsDescription(tabId: string): string;
	tabReadableElementHtmlDescription(
		tabId: string,
		readablePath: string,
	): string;
}

export const McpDescriptionsInputPort = Symbol.for("McpDescriptionsInputPort");
