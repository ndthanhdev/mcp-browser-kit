import type { ExtensionToolCallsInputPort } from "@mcp-browser-kit/core-extension";

export interface ExtensionDriverOutputPort
	extends ExtensionToolCallsInputPort {}

export const ExtensionDriverOutputPort = Symbol("ExtensionDriverOutputPort");
