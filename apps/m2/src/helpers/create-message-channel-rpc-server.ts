import { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcServer } from "@mcp-browser-kit/utils";
import { container } from "./container";

export const createMessageChannelRpcServer = () => {
	const extensionTools = container.get<ExtensionToolCallInputPort>(
		ExtensionToolCallInputPort,
	);

	const channel = new MessageChannelRpcServer(extensionTools);

	return channel;
};
