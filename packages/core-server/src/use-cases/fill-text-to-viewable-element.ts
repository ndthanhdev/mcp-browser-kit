import { inject, injectable } from "inversify";
import type { FillTextToViewableElementInputPort } from "../input-ports/fill-text-to-viewable-element";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class FillTextToViewableElementUseCase
	implements FillTextToViewableElementInputPort
{
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	fillTextToViewableElementInstruction(): string {
		return [
			"⌨️ Types text into an input field at specific X,Y coordinates",
			"* Use this to enter text into form fields by their position",
			"* Requires tabId from getTabs, x,y coordinates, and the text to enter",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* First clicks at the specified position, then types the provided text",
			"* Parameters: tabId, x, y, value (text to enter)",
		].join("\n");
	}

	fillTextToViewableElement(
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> {
		return this.browserDriver.fillTextToViewableElement(tabId, x, y, value);
	}
}
