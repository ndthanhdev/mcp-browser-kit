import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	DrivenBrowserDriverM3,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

@injectable()
export class MbkTab {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(TabToolsSetup)
		private readonly tabToolsSetup: TabToolsSetup,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("MbkTab");
	}

	static setupContainer(container: Container): void {
		// Bind logger factory
		container
			.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
			.to(DrivenLoggerFactoryConsolaBrowser);

		// Setup M3 container with required services
		DrivenBrowserDriverM3.setupTabContainer(container);

		// Register KeepAlive service
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register MbkTab service
		container.bind<MbkTab>(MbkTab).to(MbkTab);
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping MbkTab...");

		// Set up tab tools in global scope using the instance
		this.tabToolsSetup.setUpTabTools();

		// Start listening for browser runtime messages
		this.tabToolsSetup.startListen();

		// Start keep-alive mechanism
		this.keepAlive.startSending();

		this.logger.info("MbkTab bootstrap complete");
	}
}
