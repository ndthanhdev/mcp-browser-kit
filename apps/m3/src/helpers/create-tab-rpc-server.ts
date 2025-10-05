import { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcServer } from "@mcp-browser-kit/utils";
import { container } from "./container";

export const createTabRpcServer = () => {
	const extensionTools = container.get<ExtensionToolCallInputPort>(
		ExtensionToolCallInputPort,
	);

	const rpcServer = new MessageChannelRpcServer(extensionTools);

	return rpcServer;
};
