import { InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import {
	toIIFE,
	getTabs,
	getReadableElements,
	clickOnIndex,
	fillTextToIndex,
	invokeJsFn,
} from "../utils/browser-integration";
import { addDevTool } from "../utils/add-dev-tool";

export const rpcServer = new RpcServer({
	invokeJsFn,
	getTabs,
	getReadableElements,
	clickOnIndex,
	fillTextToIndex,
});

export type ExtensionProcedureMap = InferProcedureMap<typeof rpcServer>;

addDevTool({
	rpcServer,
});
