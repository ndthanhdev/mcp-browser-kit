import { inject, injectable } from "inversify";
import type { GetInnerTextInputPort } from "../input-ports/get-inner-text";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class GetInnerTextUseCase implements GetInnerTextInputPort {
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	getInnerTextInstruction(): string {
		return [
			"📝 Extracts all text content from the current web page",
			"* Retrieves all visible text from the active tab",
			"* Requires the tabId obtained from getTabs",
			"* Use this to analyze the page content without visual elements",
			"* Returns a string containing all the text on the page",
			"* Useful for getting a quick overview of page content",
		].join("\n");
	}

	getInnerText(tabId: string): Promise<string> {
		return this.browserDriver.getInnerText(tabId);
	}
}
