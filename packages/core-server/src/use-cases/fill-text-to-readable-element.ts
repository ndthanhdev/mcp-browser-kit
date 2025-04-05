import { inject, injectable } from "inversify";
import type { FillTextToReadableElementInputPort } from "../input-ports/fill-text-to-readable-element";
import { ExtensionDriverOutputPort } from "../output-ports";

@injectable()
export class FillTextToReadableElementUseCase
	implements FillTextToReadableElementInputPort
{
	constructor(
		@inject(ExtensionDriverOutputPort)
		private readonly browserDriver: ExtensionDriverOutputPort,
	) {}

	fillTextToReadableElementInstruction(): string {
		return [
			"✏️ Types text into an input field identified by its index from getReadableElements",
			"* Use this to enter text into form fields identified by their text",
			"* Requires tabId from getTabs, index from getReadableElements, and text to enter",
			"* Works with text inputs, textareas, and other editable elements",
			"* First call getReadableElements to get the index, then use this tool",
			"* Parameters: tabId, index, value (text to enter)",
		].join("\n");
	}

	fillTextToReadableElement(
		tabId: string,
		index: number,
		value: string,
	): Promise<void> {
		return this.browserDriver.fillTextToReadableElement(tabId, index, value);
	}
}
