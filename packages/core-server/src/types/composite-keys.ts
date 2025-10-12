import { toCompositeKey } from "@mcp-browser-kit/core-utils";

export const WindowKey = toCompositeKey<{
	extensionId: string;
	windowId: string;
}>([
	"extensionId",
	"windowId",
]);

export const TabKey = toCompositeKey<{
	extensionId: string;
	windowId: string;
	tabId: string;
}>([
	"extensionId",
	"windowId",
	"tabId",
]);
