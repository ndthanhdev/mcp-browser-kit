import { RpcClient } from "@mcp-browser-kit/rpc";
import type { BrowserRpcServerProcedure } from "./browser-rpc-server";

export const createBrowserRpcClient = () => {
	return new RpcClient<BrowserRpcServerProcedure>();
};
