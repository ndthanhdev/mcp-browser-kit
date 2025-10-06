import "core-js/proposals";
import {
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { container } from "./helpers/container";

const deferLogger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("trp", "defer");

// Set up ServerProvider for automated server discovery and connection
const serverProvider = container.get<ServerChannelProviderOutputPort>(
	ServerChannelProviderOutputPort,
) as ExtensionDrivenServerChannelProvider;

deferLogger.info("Starting server discovery and connection");
// Initial discovery call
serverProvider.startServersDiscovering().catch((error) => {
	deferLogger.error(
		"Error during initial server discovery and connection:",
		error,
	);
});
