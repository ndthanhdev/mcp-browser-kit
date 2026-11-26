/** Tools the MCP server registers; each one needs a description. */
export type McpToolPromptName =
	| "captureTab"
	| "savePage"
	| "invokeJsFn"
	| "openTab"
	| "closeTab"
	| "getSelection"
	| "clickOnCoordinates"
	| "fillTextToCoordinates"
	| "hitEnterOnCoordinates"
	| "clickOnElement"
	| "fillTextToElement"
	| "hitEnterOnElement"
	| "scrollPage"
	| "scrollElement"
	| "showHumanHint"
	| "getContext"
	| "getReadableText"
	| "getReadableElements"
	| "getReadableElementHtml"
	| "getSnapshotPage";

/** Descriptions of the MCP resources; per-browser and per-tab ones are built from live state. */
export interface McpResourcePrompts {
	context: string;
	bkTemplate: string;
	browser(tabCount: number, windowCount: number, shortId: string): string;
	tab(url: string, browserName: string, active: boolean): string;
	tabReadableText(tabId: string): string;
	tabReadableElements(tabId: string): string;
	tabReadableElementHtml(tabId: string, readablePath: string): string;
}

/** Everything the MCP server tells a connected client: server instructions, tools and resources. */
export interface McpServerPrompts {
	instructions: string;
	tools: Record<McpToolPromptName, string>;
	resources: McpResourcePrompts;
}

/** Tools the in-extension browser agent exposes to its model. */
export type BrowserAgentToolPromptName =
	| "captureTab"
	| "clickOnCoordinates"
	| "clickOnElement"
	| "closeTab"
	| "fillTextToCoordinates"
	| "fillTextToElement"
	| "loadTabContext"
	| "getReadableElements"
	| "getReadableText"
	| "getSelection"
	| "hitEnterOnCoordinates"
	| "hitEnterOnElement"
	| "showHumanHint"
	| "invokeJsFn"
	| "getExtensionContext"
	| "openTab";

/** System instructions and tool descriptions for the in-extension browser agent. */
export interface BrowserAgentPrompts {
	instructions: string;
	tools: Record<BrowserAgentToolPromptName, string>;
}
