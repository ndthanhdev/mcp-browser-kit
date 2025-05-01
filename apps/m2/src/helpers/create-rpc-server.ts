import { ExtensionToolCallsInputPort } from "@mcp-browser-kit/core-extension";
import { RpcServer } from "@mcp-browser-kit/rpc";
import { container } from "./container";

export const createRpcServer = () => {
	const extensionTools = container.get<ExtensionToolCallsInputPort>(
		ExtensionToolCallsInputPort,
	);

	const rpcServer = new RpcServer(extensionTools);

	return rpcServer;
};
