import { type InferProcedureMap, RpcServer } from "@mcp-browser-kit/rpc";
import * as userActions from "../utils/user-actions";

export const createExtensionRpcServer = () => {
	return new RpcServer({
		...userActions,
	});
};

export type ExtensionRpcServerProcedure = InferProcedureMap<
	ReturnType<typeof createExtensionRpcServer>
>;
