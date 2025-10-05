import {
	BrowserDriverOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { DrivenBrowserDriverM3 } from "@mcp-browser-kit/driven-browser-driver";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { container } from "./helpers/container";
import { startListenKeepAlive } from "./helpers/keep-alive";

const driverM3 = container.get<BrowserDriverOutputPort>(
	BrowserDriverOutputPort,
) as DrivenBrowserDriverM3;
driverM3.linkRpc();

startListenKeepAlive();

const serverProvider = container.get<ServerChannelProviderOutputPort>(
	ServerChannelProviderOutputPort,
) as ExtensionDrivenServerChannelProvider;

// Set up interval to discover and connect to servers every 10 seconds
setInterval(async () => {
	try {
		await serverProvider.discoverAndConnectToServers();
	} catch (error) {
		console.error("Error during server discovery and connection:", error);
	}
}, 10000);

// Initial discovery call
serverProvider.discoverAndConnectToServers().catch((error) => {
	console.error("Error during initial server discovery and connection:", error);
});

const drivingTrpcController = container.get<ExtensionDrivingTrpcController>(
	ExtensionDrivingTrpcController,
);
drivingTrpcController.listenToServerChannelEvents(serverProvider);
