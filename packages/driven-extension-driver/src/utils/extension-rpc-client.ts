import type { ExtensionRpcServerProcedure } from "@mcp-browser-kit/driven-browser-driver/helpers/extension-rpc-server";
import { RpcClient } from "@mcp-browser-kit/rpc";

export const createExtensionRpcClient = () => {
	return new RpcClient<ExtensionRpcServerProcedure>();
};
