export interface ClickOnViewableElementInputPort {
	clickOnViewableElementInstruction(): string;
	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void>;
}

export const ClickOnViewableElementInputPort = Symbol(
	"ClickOnViewableElementInputPort",
);
