import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import {
	DrivenBrowserDriverM3,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { startKeepAlive } from "./keep-alive";

@injectable()
export class MbkTab {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(TabToolsSetup)
		private readonly tabToolsSetup: TabToolsSetup,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("MbkTab");
	}

	static setupContainer(container: Container): void {
		// Setup M3 container with required services
		DrivenBrowserDriverM3.setupContainer(container);

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
		startKeepAlive();

		this.logger.info("MbkTab bootstrap complete");
	}
}
