import type { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";

export interface ExtensionDriverOutputPort extends ExtensionToolCallInputPort {}

export const ExtensionDriverOutputPort = Symbol("ExtensionDriverOutputPort");
