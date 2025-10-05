import type { ExtensionTools } from "../types";

export type ExtensionToolCallInputPort = ExtensionTools;

export const ExtensionToolCallInputPort = Symbol.for(
	"ExtensionToolCallInputPort",
);
