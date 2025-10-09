import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { DrivenBrowserDriverM3 } from "@mcp-browser-kit/extension-driven-browser-driver";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import { inject, injectable } from "inversify";

@injectable()
export class MbkSw {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly driverM3: BrowserDriverOutputPort,
		@inject(ServerChannelProviderOutputPort)
		private readonly serverProvider: ServerChannelProviderOutputPort,
		@inject(ExtensionDrivingTrpcController)
		private readonly drivingTrpcController: ExtensionDrivingTrpcController,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("MbkSw");
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping MbkSw...");

		// Link RPC for browser driver
		(this.driverM3 as DrivenBrowserDriverM3).linkRpc();

		// Start keep-alive listening
		this.keepAlive.startListening();

		// Initial discovery call
		(this.serverProvider as ExtensionDrivenServerChannelProvider)
			.startServersDiscovering()
			.catch((error) => {
				this.logger.error(
					"Error during initial server discovery and connection:",
					error,
				);
			});

		// Listen to server channel events
		this.drivingTrpcController.listenToServerChannelEvents(
			this.serverProvider as ExtensionDrivenServerChannelProvider,
		);

		this.logger.info("MbkSw bootstrap complete");
	}
}
