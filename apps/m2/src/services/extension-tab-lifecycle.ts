import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	FrameCorrelationResponder,
	TabContentMutationObserver,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

@injectable()
export class ExtensionTabLifecycle {
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;
	private readonly mutationObserver = new TabContentMutationObserver();
	private readonly frameCorrelationResponder = new FrameCorrelationResponder();

	constructor(
		@inject(TabToolsSetup)
		private readonly tabToolsSetup: TabToolsSetup,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionTabLifecycle");
	}

	static setupContainer(container: Container): void {
		// Bind logger factory
		DrivenLoggerFactoryConsolaBrowser.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);

		// Setup M2 container with required services
		DrivenBrowserDriverM2.setupTabContainer(container);

		// Register KeepAlive service
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register ExtensionTabLifecycle service
		container
			.bind<ExtensionTabLifecycle>(ExtensionTabLifecycle)
			.to(ExtensionTabLifecycle);
	}

	start(): void {
		this.logger.info("Starting ExtensionTabLifecycle...");

		// Set up tab tools in global scope using the instance
		this.tabToolsSetup.setUpTabTools();

		// Start listening for browser runtime messages
		this.tabToolsSetup.startListen();

		// Start keep-alive mechanism
		this.keepAlive.startSending();

		// Start observing DOM mutations and pinging the background.
		this.mutationObserver.start();

		// Start responding to frame-correlation pings from a parent frame.
		this.frameCorrelationResponder.start();

		this.logger.info("ExtensionTabLifecycle start complete");
	}
}
