import type { ExtensionDriverOutputPort } from "@mcp-browser-kit/core-server";
import { RpcClient } from "@mcp-browser-kit/rpc";

export const createExtensionRpcClient = () => {
	return new RpcClient<ExtensionDriverOutputPort>();
};
