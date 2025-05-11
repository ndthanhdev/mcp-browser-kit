import { type DeferMessage, RpcClient, RpcServer } from "@mcp-browser-kit/rpc";
import browser from "webextension-polyfill";
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

export const startListen = (server: RpcServer<ContentTools>) => {
	browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
		server.handleDefer(request as DeferMessage).then((result) => {
			sendResponse(result);
		});

		return true; // Keep the message channel open for sendResponse
	});
};
