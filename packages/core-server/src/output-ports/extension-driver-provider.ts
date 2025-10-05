import type Emittery from "emittery";
import { ExtensionDriverOutputPort } from "./extension-driver";

export interface ExtensionInstance {
	extensionInstanceId: string;
}

export type ExtensionDriverProviderEventEmitter = Emittery<{
	extensionConnected: ExtensionInstance;
	extensionDisconnected: ExtensionInstance;
}>;

export interface ExtensionDriverProviderOutputPort {
	on: ExtensionDriverProviderEventEmitter["on"];
	getDriver: (extensionInstanceId: string) => ExtensionDriverOutputPort;
}
// tb deleted
export const ExtensionDriverProviderOutputPort = Symbol(
	"ExtensionDriverProviderOutputPort",
);
