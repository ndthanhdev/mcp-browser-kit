import { inject, injectable } from "inversify";
import type { Tab } from "../entities/tab";
import type { GetTabsInputPort } from "../input-ports/get-tabs";
import { BrowserDriverOutputPort } from "../output-ports";

@injectable()
export class GetTabsUseCase implements GetTabsInputPort {
	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
	) {}

	getTabsInstruction(): string {
		return [
			"⚠️ CRITICAL FIRST STEP - ALWAYS START HERE BEFORE ANY OTHER TOOLS!",
			"* This tool MUST be called first to obtain the list of open browser tabs.",
			"* Each tab includes a unique ID that is required for all subsequent tool operations.",
			"* Note which tab is active (marked with 'active: true') as this is essential information.",
			"* The tabId from this list is required for captureActiveTab and all other interactions.",
			"* Workflow: 1) getTabs → 2) captureActiveTab → 3) interact with elements",
		].join("\n");
	}
	getTabs(): Promise<Tab[]> {
		return this.browserDriver.getTabs();
	}
}
