import { type InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import * as browser from "../utils/user-actions";

export const createExtensionRpcServer = () => {
	return new RpcServer({
		...browser,
	});
};

export type ExtensionRpcServerProcedure = InferProcedureMap<
	ReturnType<typeof createExtensionRpcServer>
>;

export const extensionRpcServer = createExtensionRpcServer();
