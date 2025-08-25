import type Emittery from "emittery";
import type { ExtensionInstance } from "../types";

export type  ExtensionDriverProviderEventEmitter = Emittery<{
	extensionConnected: ExtensionInstance;
	extensionDisconnected: ExtensionInstance;
	extensionUpdated: ExtensionInstance;
}>;

export interface ExtensionDriverProviderOutputPort {
	on:  ExtensionDriverProviderEventEmitter["on"];
}

export const ExtensionDriverProviderOutputPort = Symbol(
	"ExtensionDriverProviderOutputPort",
);
