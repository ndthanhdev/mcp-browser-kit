import type { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension/output-ports/browser-driver";

export interface ExtensionDriverOutputPort extends BrowserDriverOutputPort {}

export const ExtensionDriverOutputPort = Symbol("ExtensionDriverOutputPort");
