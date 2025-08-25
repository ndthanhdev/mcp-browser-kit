import type { ExtensionTools } from "../types";

export type ExtensionToolCallsInputPort = ExtensionTools;

export const ExtensionToolCallsInputPort = Symbol.for(
	"ExtensionToolCallsInputPort",
);
