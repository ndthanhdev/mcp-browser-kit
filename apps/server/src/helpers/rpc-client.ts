import type { ExtensionProcedureMap } from "@mcp-browser-kit/extension/helpers/rpc-server";
import { RpcClient } from "@mcp-browser-kit/rpc";

export const rpcClient = new RpcClient<ExtensionProcedureMap>();
