export interface FillTextToReadableElementInputPort {
	fillTextToReadableElementInstruction(): string;
	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void>;
}

export const FillTextToReadableElementInputPort = Symbol(
	"FillTextToReadableElementInputPort",
);
