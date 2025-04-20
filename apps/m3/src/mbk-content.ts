import browser from "webextension-polyfill";
import { setupContentScriptTools } from "@mcp-browser-kit/driven-browser-driver";
import { createRpcServerM3 } from "@mcp-browser-kit/driven-browser-driver/src/helpers/create-content-script-rpc-m3";

const rpcServerM3 = createRpcServerM3();

setupContentScriptTools();

console.log("Content script loaded");
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	console.log("Received message:", { request, sender, sendResponse });

	// rpcServerM3.handleDefer();
});
