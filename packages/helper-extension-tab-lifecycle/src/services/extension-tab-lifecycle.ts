import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	FrameCorrelationResponder,
	TabContentMutationObserver,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import { Container, inject, injectable } from "inversify";

/**
 * The manifest-version-specific half of the tab wiring.
 *
 * `DrivenBrowserDriverM2` and `DrivenBrowserDriverM3` both satisfy this. It is
 * the *only* thing that differed between the previously duplicated per-app
 * copies of this class, so it is a parameter rather than a subclass.
 */
export interface TabDriverSetup {
	setupTabContainer(container: Container): void;
}

/**
 * Everything the extension runs inside a page.
 *
 * A content script is the only context that can touch a page's DOM, so the tab
 * half of {@link import("@mcp-browser-kit/core-extension").BrowserDriverOutputPort}
 * lives here: the background sends a tool call over runtime messaging, and
 * `TabToolsSetup` executes it against the real document.
 *
 * Shared by `apps/m2`, `apps/m3` and `apps/ext-wxt`. Without it an extension can
 * hold a browser driver and still be unable to click anything.
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

	/**
	 * Wire a tab-context container.
	 *
	 * @param driver the manifest-version-specific driver — `DrivenBrowserDriverM2`
	 *   or `DrivenBrowserDriverM3`.
	 */
	static setupContainer(container: Container, driver: TabDriverSetup): void {
		DrivenLoggerFactoryConsolaBrowser.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);

		driver.setupTabContainer(container);

		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);
		container
			.bind<ExtensionTabLifecycle>(ExtensionTabLifecycle)
			.to(ExtensionTabLifecycle);
	}

	/**
	 * Build and start a tab lifecycle in one call, for a content-script entry.
	 *
	 * Owns the container rather than taking one, so callers never name
	 * inversify's `Container` type. Apps resolve inversify under different
	 * `moduleResolution` settings — `apps/ext-wxt` gets the ESM typings, the
	 * workspace default gets CJS — and the two are structurally incompatible even
	 * though they are the same class at runtime.
	 */
	static start(driver: TabDriverSetup): void {
		const container = new Container({
			defaultScope: "Singleton",
		});
		ExtensionTabLifecycle.setupContainer(container, driver);
		container.get<ExtensionTabLifecycle>(ExtensionTabLifecycle).start();
	}

	start(): void {
		this.logger.info("Starting ExtensionTabLifecycle...");

		// Expose the tool implementations in the page's global scope.
		this.tabToolsSetup.setUpTabTools();

		// Start listening for browser runtime messages.
		this.tabToolsSetup.startListen();

		// Start keep-alive mechanism.
		this.keepAlive.startSending();

		// Start observing DOM mutations and pinging the background.
		this.mutationObserver.start();

		// Start responding to frame-correlation pings from a parent frame.
		this.frameCorrelationResponder.start();

		this.logger.info("ExtensionTabLifecycle start complete");
	}
}
