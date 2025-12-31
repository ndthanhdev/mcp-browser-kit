import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	DrivenBrowserDriverM3,
	type DrivenBrowserDriverM3 as DrivenBrowserDriverM3Type,
} from "@mcp-browser-kit/extension-driven-browser-driver/m3";
import {
	ExtensionDrivenServerChannelProvider,
	type ExtensionDrivenServerChannelProvider as ExtensionDrivenServerChannelProviderType,
} from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
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

	static setupContainer(container: Container): void {
		// Bind logger factory
		DrivenLoggerFactoryConsolaBrowser.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);

		// Setup browser driver
		DrivenBrowserDriverM3.setupContainer(container);

		// Setup server channel provider with discoverer
		ExtensionDrivenServerChannelProvider.setupContainer(container);

		// Setup TRPC controller
		container
			.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
			.to(ExtensionDrivingTrpcController);

		// Register KeepAlive service
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register MbkSw service
		container.bind<MbkSw>(MbkSw).to(MbkSw);
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping MbkSw...");

		// Link RPC for browser driver
		(this.driverM3 as DrivenBrowserDriverM3Type).linkRpc();

		// Start keep-alive listening
		this.keepAlive.startListening();

		// Initial discovery call
		(this.serverProvider as ExtensionDrivenServerChannelProviderType)
			.startServersDiscovering()
			.catch((error) => {
				this.logger.error(
					"Error during initial server discovery and connection:",
					error,
				);
			});

		// Listen to server channel events
		this.drivingTrpcController.listenToServerChannelEvents(
			this.serverProvider as ExtensionDrivenServerChannelProviderType,
		);

		this.logger.info("MbkSw bootstrap complete");
	}
}
