import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports/logger-factory";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
// Exact modules, not the package barrel. The barrel re-exports the background
// drivers, which pull in the whole background half — and, through the
// output-ports barrel, zod. A content script needs none of it.
import { FrameCorrelationResponder } from "@mcp-browser-kit/extension-driven-browser-driver/services/frame-correlation-responder";
import { TabContentMutationObserver } from "@mcp-browser-kit/extension-driven-browser-driver/services/tab-content-mutation-observer";
import { TabToolsSetup } from "@mcp-browser-kit/extension-driven-browser-driver/services/tab-tools-setup";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import { Container, inject, injectable } from "inversify";

/** Per-app choices about what the tab half should run. */
export interface TabLifecycleOptions {
	/**
	 * Ping the background every 25s to hold the MV3 service worker awake.
	 *
	 * Opt-in, and deliberately so. It is only worth it when the background owns
	 * something that must outlive its idle timeout — the tRPC channel to the
	 * local MCP server, in `apps/m2` and `apps/m3`. Enabling it elsewhere pins
	 * the worker awake from every frame of every tab, and if the background
	 * never called {@link KeepAlive.startListening} every ping fails.
	 */
	keepAlive?: boolean;
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
	 */
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
	 * Owns the container rather than taking one, so callers never name
	 * inversify's `Container` type. Apps resolve inversify under different
	 * `moduleResolution` settings — `apps/ext-wxt` gets the ESM typings, the
	 * workspace default gets CJS — and the two are structurally incompatible even
	 * though they are the same class at runtime.
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

		// Expose the tool implementations in the page's global scope.
		this.tabToolsSetup.setUpTabTools();

		// Start listening for browser runtime messages.
		this.tabToolsSetup.startListen();

		if (options.keepAlive) {
			this.keepAlive.startSending();
		}

		// Start observing DOM mutations and pinging the background.
		this.mutationObserver.start();

		// Start responding to frame-correlation pings from a parent frame.
		this.frameCorrelationResponder.start();

		this.logger.info("ExtensionTabLifecycle start complete");
	}
}
