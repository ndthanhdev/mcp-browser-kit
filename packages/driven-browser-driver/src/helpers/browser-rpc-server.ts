import { type InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import * as browser from "../utils/user-actions";

export const createBrowserRpcServer = () => {
	return new RpcServer({
		...browser,
	});
};

export type BrowserRpcServerProcedure = InferProcedureMap<
	ReturnType<typeof createBrowserRpcServer>
>;

export const browserRpcServer = createBrowserRpcServer();
