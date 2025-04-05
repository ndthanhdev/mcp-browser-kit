import { type InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import { addDevTool } from "../utils/add-dev-tool";
import {
	captureActiveTab,
	clickOnReadableElement,
	clickOnViewableElement,
	fillTextToReadableElement,
	fillTextToViewableElement,
	getExecuteScriptResult,
	getInnerText,
	getReadableElements,
	getTabs,
	invokeJsFn,
	toIIFE,
} from "../utils/browser-integration";

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
