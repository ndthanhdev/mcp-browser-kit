import type { BrowserAgentPrompts, McpServerPrompts } from "../types";

/** Supplies the LLM-facing text: MCP server instructions and descriptions, and the browser agent prompt. */
export interface PromptProviderOutputPort {
	mcpServer(): McpServerPrompts;
	browserAgent(): BrowserAgentPrompts;
}

export const PromptProviderOutputPort = Symbol("PromptProviderOutputPort");
