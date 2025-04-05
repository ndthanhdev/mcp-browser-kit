export interface ClickOnReadableElementInputPort {
	clickOnReadableElementInstruction(): string;
	clickOnReadableElement(tabId: string, index: number): Promise<void>;
}

export const ClickOnReadableElementInputPort = Symbol(
	"ClickOnReadableElementInputPort",
);
