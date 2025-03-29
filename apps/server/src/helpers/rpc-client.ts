import { RpcClient } from "@mcp-browser-kit/rpc";
import type { ExtensionProcedureMap } from "@mcp-browser-kit/extension/helpers/rpc-server";

export const rpcClient = new RpcClient<ExtensionProcedureMap>();
