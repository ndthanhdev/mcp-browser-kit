import browser from "webextension-polyfill";
import { setupContentScriptTools } from "@mcp-browser-kit/driven-browser-driver";
import { createM3TabRpcServer } from "@mcp-browser-kit/driven-browser-driver/src/helpers/create-rpc-m3";

const tabRpcServerM3 = createM3TabRpcServer();

setupContentScriptTools();

console.log("Content script loaded");
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	console.log("Received message:", { request, sender, sendResponse });
	// rpcServerM3.handleDefer();
});
