import { inject, injectable } from "inversify";
import type { InvokeJsFnInputPort } from "../input-ports/invoke-js-fn";
import { ExtensionDriverOutputPort } from "../output-ports";

@injectable()
export class InvokeJsFnUseCase implements InvokeJsFnInputPort {
	constructor(
		@inject(ExtensionDriverOutputPort)
		private readonly browserDriver: ExtensionDriverOutputPort,
	) {}

	invokeJsFnInstruction(): string {
		return [
			"⚙️ Executes custom JavaScript code in the context of the web page",
			"* Use this for advanced operations not covered by other tools",
			"* Requires tabId from getTabs and JavaScript code to execute",
			"* The code should be the body of a function that returns a value",
			"* Example: 'return document.title;' to get the page title",
			"* Gives you full flexibility for custom browser automation",
			"* Parameters: tabId, fnBodyCode (JavaScript code as string)",
		].join("\n");
	}

	invokeJsFn(tabId: string, fnBodyCode: string): Promise<unknown> {
		return this.browserDriver.invokeJsFn(tabId, fnBodyCode);
	}
}
