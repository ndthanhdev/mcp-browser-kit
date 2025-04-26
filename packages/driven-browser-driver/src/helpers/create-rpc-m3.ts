import { RpcServer, RpcClient } from "@mcp-browser-kit/rpc";
import { type ContentTools, contentTools } from "../utils";

export const createM3TabRpcServer = () => {
	const rpcServer = new RpcServer(contentTools);

	return rpcServer;
};

export const createM3TabRpcClient = () => {
	const rpcClient = new RpcClient<
		ContentTools,
		{
			tabId: string;
		}
	>();

	return rpcClient;
};
