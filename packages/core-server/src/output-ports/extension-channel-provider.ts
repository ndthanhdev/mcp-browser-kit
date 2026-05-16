import type { BrowserEvent, MessageChannel } from "@mcp-browser-kit/types";
import type Emittery from "emittery";

export interface ChannelInfo {
	channelId: string;
}

export interface ChannelBrowserEvent {
	channelId: string;
	event: BrowserEvent;
}

export type ExtensionDriverProviderEventEmitter = Emittery<{
	connected: ChannelInfo;
	disconnected: ChannelInfo;
	browserEvent: ChannelBrowserEvent;
}>;

export interface ExtensionChannelProviderOutputPort {
	on: ExtensionDriverProviderEventEmitter["on"];
	off: ExtensionDriverProviderEventEmitter["off"];
	getMessageChannel: (channelId: string) => MessageChannel;
	/**
	 * Emit a browser event received from an extension over the given channel.
	 * Called by transport adapters (e.g. the tRPC `events.publish` router).
	 */
	emitBrowserEvent: (channelId: string, event: BrowserEvent) => void;
}

export const ExtensionChannelProviderOutputPort = Symbol(
	"ExtensionChannelProviderOutputPort",
);
