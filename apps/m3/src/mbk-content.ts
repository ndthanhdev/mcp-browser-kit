import { setupContentScriptTools } from "@mcp-browser-kit/driven-browser-driver";
import {
	createM3TabRpcServer,
	startListen,
} from "@mcp-browser-kit/driven-browser-driver/src/helpers/create-rpc-m3";

console.log("Content script loaded");
setupContentScriptTools();

const tabRpcServerM3 = createM3TabRpcServer();
startListen(tabRpcServerM3);
