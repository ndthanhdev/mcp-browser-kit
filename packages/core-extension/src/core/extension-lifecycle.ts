import { inject, injectable } from "inversify";
import type { ExtensionLifecycleInputPort } from "../input-ports/extension-lifecycle";
import { PublishBrowserStateInputPort } from "../input-ports/publish-browser-state";
import { BrowserDriverOutputPort } from "../output-ports/browser-driver";
import { FeatureFlagsOutputPort } from "../output-ports/feature-flags";
import { LoggerFactoryOutputPort } from "../output-ports/logger-factory";
import { ServerChannelProviderOutputPort } from "../output-ports/server-channel-provider";

/**
 * Orchestrates extension startup. This is the single place where the other use
 * cases get started/wired up: link the tab RPC transport, begin server
 * discovery, then start browser-state publishing (and future use cases).
 */
@injectable()
export class ExtensionLifecycleUseCase implements ExtensionLifecycleInputPort {
	private readonly logger;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
		@inject(ServerChannelProviderOutputPort)
		private readonly serverProvider: ServerChannelProviderOutputPort,
		@inject(PublishBrowserStateInputPort)
		private readonly publishBrowserState: PublishBrowserStateInputPort,
		@inject(FeatureFlagsOutputPort)
		private readonly featureFlags: FeatureFlagsOutputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionLifecycleUseCase");
	}

	start = async (): Promise<void> => {
		this.logger.info("Starting extension...");

		// Ready the feature flags provider before anything else may need to read flags.
		await this.featureFlags.start().catch((error) => {
			this.logger.error("Error starting feature flags provider:", error);
		});

		// Link RPC for the browser driver (tab content scripts).
		this.browserDriver.linkRpc();

		// Begin discovering and connecting to MCP servers.
		await this.serverProvider.startServersDiscovering().catch((error) => {
			this.logger.error(
				"Error during initial server discovery and connection:",
				error,
			);
		});

		// Start observing browser state and publishing snapshots to the server.
		await this.publishBrowserState.start().catch((error) => {
			this.logger.error("Error starting browser-state publisher:", error);
		});

		this.logger.info("Extension start complete");
	};
}
