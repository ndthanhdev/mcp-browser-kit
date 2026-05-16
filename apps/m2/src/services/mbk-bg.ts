import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	PublishBrowserStateInputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserStateSource } from "@mcp-browser-kit/extension-driven-browser-driver";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import {
	ExtensionDrivenServerChannelProvider,
	type ExtensionDrivenServerChannelProvider as ExtensionDrivenServerChannelProviderType,
} from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

@injectable()
export class MbkBg {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly driverM2: BrowserDriverOutputPort,
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
		this.logger = loggerFactory.create("MbkBg");
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

		// Register MbkBg service
		container.bind<MbkBg>(MbkBg).to(MbkBg);
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping MbkBg...");

		// Link RPC for browser driver
		(this.driverM2 as DrivenBrowserDriverM2).linkRpc();

		// Setup TRPC controller to listen to server channel events
		this.trpcController.listenToServerChannelEvents(
			this.serverProvider as ExtensionDrivenServerChannelProviderType,
		);

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

		// Start observing browser state and publishing snapshots to the server.
		this.publishBrowserState.start().catch((error) => {
			this.logger.error("Error starting browser-state publisher:", error);
		});

		this.logger.info("MbkBg bootstrap complete");
	}
}
