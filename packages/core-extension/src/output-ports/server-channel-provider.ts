import type { MessageChannel } from "@mcp-browser-kit/types";
import type Emittery from "emittery";

export interface ServerChannelInfo {
	channelId: string;
}

export type ExtensionDriverProviderEventEmitter = Emittery<{
	connected: ServerChannelInfo;
	disconnected: ServerChannelInfo;
}>;

export type ServerChannelProviderOutputPort = {
	on: ExtensionDriverProviderEventEmitter["on"];
	discoverAndConnectToServers: () => Promise<void>;
	getMessageChannel: (channelId: string) => MessageChannel;
};

export const ServerChannelProviderOutputPort = Symbol(
	"ServerChannelProviderOutputPort",
);
