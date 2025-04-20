import { RpcServer, RpcClient } from "@mcp-browser-kit/rpc";
import { ContentTools } from "../utils";

export const createRpcServerM3 = () => {
	const rpcServer = new RpcServer({});

	return rpcServer;
};

export const createRpcClientM3 = () => {
	const rpcClient = new RpcClient<ContentTools>();

	return rpcClient;
};
