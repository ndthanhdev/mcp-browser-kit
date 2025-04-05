import { inject, injectable } from "inversify";
import type {
	GetReadableElementsInputPort,
	ReadableElement,
} from "../input-ports/get-readable-elements";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class GetReadableElementsUseCase
	implements GetReadableElementsInputPort
{
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	getReadableElementsInstruction(): string {
		return [
			"🔍 Lists all interactive elements on the page with their text",
			"* Returns a list of elements with their index, HTML tag, and text content",
			"* Requires the tabId obtained from getTabs",
			"* Each element is returned as [index, tag, text]",
			"* Use the index to interact with elements through click or fill operations",
			"* Helps you identify which elements can be interacted with by their text",
		].join("\n");
	}

	getReadableElements(tabId: string): Promise<ReadableElement[]> {
		return this.browserDriver.getReadableElements(tabId);
	}
}
