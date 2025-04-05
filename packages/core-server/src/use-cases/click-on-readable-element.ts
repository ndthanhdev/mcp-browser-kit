import { inject, injectable } from "inversify";
import type { ClickOnReadableElementInputPort } from "../input-ports/click-on-readable-element";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class ClickOnReadableElementUseCase
	implements ClickOnReadableElementInputPort
{
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	clickOnReadableElementInstruction(): string {
		return [
			"🔘 Clicks on an element identified by its index from getReadableElements",
			"* Use this to click on elements after identifying them by their text",
			"* Requires tabId from getTabs and index from getReadableElements",
			"* More reliable than coordinate-based clicking for dynamic layouts",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index",
		].join("\n");
	}

	clickOnReadableElement(tabId: string, index: number): Promise<void> {
		return this.browserDriver.clickOnReadableElement(tabId, index);
	}
}
