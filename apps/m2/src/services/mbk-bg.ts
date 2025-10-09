import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import { inject, injectable } from "inversify";

@injectable()
export class MbkBg {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly driverM2: BrowserDriverOutputPort,
		@inject(ServerChannelProviderOutputPort)
		private readonly serverProvider: ServerChannelProviderOutputPort,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("MbkBg");
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping MbkBg...");

		// Link RPC for browser driver
		(this.driverM2 as DrivenBrowserDriverM2).linkRpc();

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

		this.logger.info("MbkBg bootstrap complete");
	}
}
