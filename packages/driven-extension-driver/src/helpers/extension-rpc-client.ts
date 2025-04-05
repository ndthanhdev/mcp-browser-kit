import { RpcClient } from "@mcp-browser-kit/rpc";
import type { ExtensionRpcServerProcedure } from "./extension-rpc-server";

export const createExtensionRpcClient = () => {
	return new RpcClient<ExtensionRpcServerProcedure>();
};
