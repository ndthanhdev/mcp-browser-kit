import { InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import {
	toIIFE,
	getTabs,
	getInnerText,
	getReadableElements,
	clickOnReadableElement,
	fillTextToReadableElement,
	captureActiveTab,
	clickOnViewableElement,
	fillTextToViewableElement,
	getExecuteScriptResult,
	invokeJsFn,
} from "../utils/browser-integration";
import { addDevTool } from "../utils/add-dev-tool";

export const rpcServer = new RpcServer({
	invokeJsFn,
	getTabs,
	getInnerText,
	getReadableElements,
	clickOnReadableElement,
	fillTextToReadableElement,
	captureActiveTab,
	clickOnViewableElement,
	fillTextToViewableElement,
	getExecuteScriptResult,
});

export type ExtensionProcedureMap = InferProcedureMap<typeof rpcServer>;

addDevTool({
	rpcServer,
});
