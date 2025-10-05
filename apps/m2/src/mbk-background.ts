import "core-js/proposals";
import {
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { container } from "./helpers/container";
import { createMessageChannelRpcServer } from "./helpers/create-message-channel-rpc-server";

const deferLogger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("trp", "defer");

const _serverChannel = createMessageChannelRpcServer();

// Set up ServerProvider for automated server discovery and connection
const serverProvider = container.get<ServerChannelProviderOutputPort>(
	ServerChannelProviderOutputPort,
) as ExtensionDrivenServerChannelProvider;

// Set up interval to discover and connect to servers every 10 seconds
setInterval(async () => {
	try {
		await serverProvider.discoverAndConnectToServers();
	} catch (error) {
		deferLogger.error("Error during server discovery and connection:", error);
	}
}, 10000);

// Initial discovery call
serverProvider.discoverAndConnectToServers().catch((error) => {
	deferLogger.error(
		"Error during initial server discovery and connection:",
		error,
	);
});
