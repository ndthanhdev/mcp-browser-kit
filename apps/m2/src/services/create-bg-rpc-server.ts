import { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcServer } from "@mcp-browser-kit/core-utils";
import { containerBg } from "./container-bg";

export const createBgRpcServer = () => {
	const extensionTools = containerBg.get<ExtensionToolCallInputPort>(
		ExtensionToolCallInputPort,
	);

	const rpcServer = new MessageChannelRpcServer(extensionTools);
	return rpcServer;
};
