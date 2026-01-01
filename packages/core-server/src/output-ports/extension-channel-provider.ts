import type { MessageChannel } from "@mcp-browser-kit/types";
import type Emittery from "emittery";

export interface ChannelInfo {
	channelId: string;
}

export type ExtensionDriverProviderEventEmitter = Emittery<{
	connected: ChannelInfo;
	disconnected: ChannelInfo;
}>;

export interface ExtensionChannelProviderOutputPort {
	on: ExtensionDriverProviderEventEmitter["on"];
	getMessageChannel: (channelId: string) => MessageChannel;
}

export const ExtensionChannelProviderOutputPort = Symbol(
	"ExtensionChannelProviderOutputPort",
);
