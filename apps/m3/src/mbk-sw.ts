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

// Initial discovery call
serverProvider.startServersDiscovering().catch((error) => {
	console.error("Error during initial server discovery and connection:", error);
});

const drivingTrpcController = container.get<ExtensionDrivingTrpcController>(
	ExtensionDrivingTrpcController,
);
drivingTrpcController.listenToServerChannelEvents(serverProvider);
