import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports/logger-factory";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
// Exact modules, not the package barrel: the barrel pulls in the background
// drivers and zod, which a content script doesn't need.
import { FrameCorrelationResponder } from "@mcp-browser-kit/extension-driven-browser-driver/services/frame-correlation-responder";
import { TabContentMutationObserver } from "@mcp-browser-kit/extension-driven-browser-driver/services/tab-content-mutation-observer";
import { TabToolsSetup } from "@mcp-browser-kit/extension-driven-browser-driver/services/tab-tools-setup";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import { Container, inject, injectable } from "inversify";

/** Per-app choices about what the tab half should run. */
export interface TabLifecycleOptions {
	/**
	 * Ping the background every 25s to hold the MV3 service worker awake.
	 * Only for backgrounds that call {@link KeepAlive.startListening} and must
	 * outlive the idle timeout.
	 */
	keepAlive?: boolean;
}

/**
 * Everything the extension runs inside a page: the tab half of
 * {@link import("@mcp-browser-kit/core-extension").BrowserDriverOutputPort},
 * which executes tool calls the background sends over runtime messaging.
 */
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
		DrivenLoggerFactoryConsolaBrowser.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);

		TabToolsSetup.setupContainer(container);

		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);
		container
			.bind<ExtensionTabLifecycle>(ExtensionTabLifecycle)
			.to(ExtensionTabLifecycle);
	}

	/**
	 * Build and start a tab lifecycle in one call, for a content-script entry.
	 *
	 * Owns the container so callers never name inversify's `Container` type:
	 * apps resolve inversify's ESM and CJS typings, which are structurally
	 * incompatible.
	 */
	static start(options: TabLifecycleOptions = {}): void {
		const container = new Container({
			defaultScope: "Singleton",
		});
		ExtensionTabLifecycle.setupContainer(container);
		container.get<ExtensionTabLifecycle>(ExtensionTabLifecycle).start(options);
	}

	start(options: TabLifecycleOptions = {}): void {
		this.logger.info("Starting ExtensionTabLifecycle...");

		this.tabToolsSetup.setUpTabTools();
		this.tabToolsSetup.startListen();

		if (options.keepAlive) {
			this.keepAlive.startSending();
		}

		this.mutationObserver.start();
		this.frameCorrelationResponder.start();

		this.logger.info("ExtensionTabLifecycle start complete");
	}
}
