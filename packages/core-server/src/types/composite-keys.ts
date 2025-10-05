import { toCompositeKey } from "@mcp-browser-kit/utils";

export const WindowKey = toCompositeKey<{
	browserId: string;
	windowId: string;
}>(":");

export const TabKey = toCompositeKey<{
	browserId: string;
	windowId: string;
	tabId: string;
}>(":");
