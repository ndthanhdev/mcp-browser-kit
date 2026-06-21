import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	PublishBrowserStateInputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserStateSource } from "@mcp-browser-kit/extension-driven-browser-driver";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

@injectable()
export class ExtensionBootstrap {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly driverM2: DrivenBrowserDriverM2,
		@inject(ServerChannelProviderOutputPort)
		private readonly serverProvider: ServerChannelProviderOutputPort,
		@inject(ExtensionDrivingTrpcController)
		private readonly trpcController: ExtensionDrivingTrpcController,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(PublishBrowserStateInputPort)
		private readonly publishBrowserState: PublishBrowserStateInputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionBootstrap");
	}

	static setupContainer(container: Container): void {
		// Bind logger factory
		DrivenLoggerFactoryConsolaBrowser.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);

		// Setup browser driver
		DrivenBrowserDriverM2.setupContainer(container);

		// Setup browser-state source (observability)
		DrivenBrowserStateSource.setupContainer(container);

		// Setup server channel provider with discoverer
		// (also binds ServerEventSinkOutputPort to the same instance)
		ExtensionDrivenServerChannelProvider.setupContainer(container);

		// Register ExtensionDrivingTrpcController service
		container
			.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
			.to(ExtensionDrivingTrpcController);

		// Register KeepAlive service
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register ExtensionBootstrap service
		container
			.bind<ExtensionBootstrap>(ExtensionBootstrap)
			.to(ExtensionBootstrap);
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping ExtensionBootstrap...");

		// Link RPC for browser driver
		this.driverM2.linkRpc();

		// Setup TRPC controller to listen to server channel events
		this.trpcController.listenToServerChannelEvents(this.serverProvider);

		// Start keep-alive listening
		this.keepAlive.startListening();

		// Initial discovery call
		this.serverProvider.startServersDiscovering().catch((error) => {
			this.logger.error(
				"Error during initial server discovery and connection:",
				error,
			);
		});

		// Start observing browser state and publishing snapshots to the server.
		this.publishBrowserState.start().catch((error) => {
			this.logger.error("Error starting browser-state publisher:", error);
		});

		this.logger.info("ExtensionBootstrap bootstrap complete");
	}
}
