import type { ExtensionToolsInputPort } from "@mcp-browser-kit/core-extension";

export interface ExtensionDriverOutputPort extends ExtensionToolsInputPort {}

export const ExtensionDriverOutputPort = Symbol("ExtensionDriverOutputPort");
