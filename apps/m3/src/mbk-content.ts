import { setupContentScriptTools } from "@mcp-browser-kit/driven-browser-driver";
import {
	createM3TabRpcServer,
	startListen,
} from "@mcp-browser-kit/driven-browser-driver/helpers/create-m3-tab-rpc";
import { startKeepAlive } from "./helpers/keep-alive";

console.log("Content script loaded");
setupContentScriptTools();

const tabRpcServerM3 = createM3TabRpcServer();
startListen(tabRpcServerM3);
startKeepAlive();
