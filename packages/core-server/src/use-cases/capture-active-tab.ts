import { inject, injectable } from "inversify";
import type { Screenshot } from "../input-ports/capture-active-tab";
import type { CaptureActiveTabInputPort } from "../input-ports/capture-active-tab";
import { ExtensionDriverOutputPort } from "../output-ports";

@injectable()
export class CaptureActiveTabUseCase implements CaptureActiveTabInputPort {
	constructor(
		@inject(ExtensionDriverOutputPort)
		private readonly browserDriver: ExtensionDriverOutputPort,
	) {}

	captureActiveTabInstruction(): string {
		return [
			"📷 Captures a screenshot of the active browser tab",
			"* Use this tool after calling getTabs to obtain visual context of the current page",
			"* The screenshot helps you see what the browser is displaying to the user",
			"* No parameters are needed as it automatically captures the active tab",
			"* Returns an image with width, height, and data in base64 format",
			"* Workflow: 1) getTabs → 2) captureActiveTab → 3) interact with elements",
		].join("\n");
	}

	captureActiveTab(): Promise<Screenshot> {
		return this.browserDriver.captureActiveTab();
	}
}
