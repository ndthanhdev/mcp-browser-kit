import type { ExtensionToolCallsInputPort } from "@mcp-browser-kit/core-extension";
import { RpcServer } from "@mcp-browser-kit/rpc";
import { container } from "./container";

export const createSwRpcServer = () => {
	const extensionTools = container.get<ExtensionToolCallsInputPort>(
		ExtensionToolsInputPort,
	);

	const rpcServer = new RpcServer(extensionTools);

	return rpcServer;
};
