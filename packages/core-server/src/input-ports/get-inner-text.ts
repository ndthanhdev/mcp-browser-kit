export interface GetInnerTextInputPort {
	getInnerTextInstruction(): string;
	getInnerText(tabId: string): Promise<string>;
}

export const GetInnerTextInputPort = Symbol("GetInnerTextInputPort");
