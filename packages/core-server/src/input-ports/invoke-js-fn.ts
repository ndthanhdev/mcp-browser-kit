export interface InvokeJsFnInputPort {
	invokeJsFnInstruction(): string;
	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown>;
}

export const InvokeJsFnInputPort = Symbol("InvokeJsFnInputPort");
