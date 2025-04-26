import { ExtensionToolsInputPort } from "@mcp-browser-kit/core-extension";
import { RpcServer } from "@mcp-browser-kit/rpc";
import { container } from "./container";

export const createSwRpcServer = () => {
  const extensionTools = container.get<ExtensionToolsInputPort>(
    ExtensionToolsInputPort,
  );

  const rpcServer = new RpcServer(extensionTools);

  return rpcServer;
};
