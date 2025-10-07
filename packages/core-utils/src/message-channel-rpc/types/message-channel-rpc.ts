import type { MessageChannel } from "@mcp-browser-kit/types/message-channel";

export interface DeferMessage {
	procedure: string;
	args: unknown[];
	id: string;
	extraArgs?: unknown;
}

export interface ResolveMessage {
	id: string;
	isOk: boolean;
	result: unknown;
}

export type DeferData = {
	defer: DeferMessage;
};

export type ResolveData = {
	resolve: ResolveMessage;
};

export type MessageChannelForRpcClient = MessageChannel<ResolveData, DeferData>;

export type MessageChannelForRpcServer = MessageChannel<DeferData, ResolveData>;
