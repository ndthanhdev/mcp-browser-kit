export type ReadableElement = [number, string, string]; // [index, HTML tag, accessible text]

export interface GetReadableElementsInputPort {
	getReadableElementsInstruction(): string;
	getReadableElements(tabId: string): Promise<ReadableElement[]>;
}

export const GetReadableElementsInputPort = Symbol(
	"GetReadableElementsInputPort",
);
