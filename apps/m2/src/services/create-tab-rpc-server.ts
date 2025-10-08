import { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcServer } from "@mcp-browser-kit/core-utils";
import { containerTab } from "./container-tab";

export const createTabRpcServer = () => {
	const extensionTools = containerTab.get<ExtensionToolCallInputPort>(
		ExtensionToolCallInputPort,
	);

	const rpcServer = new MessageChannelRpcServer(extensionTools);

	return rpcServer;
};
