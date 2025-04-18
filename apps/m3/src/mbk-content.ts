import browser from "webextension-polyfill";
import { setupContentScriptTools } from "@mcp-browser-kit/driven-browser-driver";

setupContentScriptTools();

console.log("Content script loaded");
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("Received message:", { request, sender, sendResponse });
});
