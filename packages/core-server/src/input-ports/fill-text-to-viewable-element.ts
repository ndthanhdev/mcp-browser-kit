export interface FillTextToViewableElementInputPort {
	fillTextToViewableElementInstruction(): string;
	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void>;
}

export const FillTextToViewableElementInputPort = Symbol(
	"FillTextToViewableElementInputPort",
);
