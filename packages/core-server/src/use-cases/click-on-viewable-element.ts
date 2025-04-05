import { inject, injectable } from "inversify";
import type { ClickOnViewableElementInputPort } from "../input-ports/click-on-viewable-element";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class ClickOnViewableElementUseCase
	implements ClickOnViewableElementInputPort
{
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	clickOnViewableElementInstruction(): string {
		return [
			"👆 Clicks on an element at specific X,Y coordinates",
			"* Use this to click on elements by their position on the screen",
			"* Requires tabId from getTabs and x,y coordinates from the screenshot",
			"* Coordinates are based on the captureActiveTab screenshot dimensions",
			"* Useful when you know the visual position of an element",
			"* Parameters: tabId, x, y",
		].join("\n");
	}

	clickOnViewableElement(tabId: string, x: number, y: number): Promise<void> {
		return this.browserDriver.clickOnViewableElement(tabId, x, y);
	}
}
