import { RpcServer, RpcClient, type DeferMessage } from "@mcp-browser-kit/rpc";
import { type ContentTools, contentTools } from "../utils";
import browser from "webextension-polyfill";

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
		console.log("onMessage", request, sender);
		server.handleDefer(request as DeferMessage).then((result) => {
			console.log("onMessage result", result);
			sendResponse(result);
		});

		return true; // Keep the message channel open for sendResponse
	});
};
