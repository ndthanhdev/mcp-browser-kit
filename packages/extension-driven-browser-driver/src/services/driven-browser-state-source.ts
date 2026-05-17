import {
	type BrowserStateHint,
	BrowserStateSourceOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import browser from "webextension-polyfill";

/** runtime message kind sent by the tab-content-mutation-observer content script. */
const TAB_CONTENT_CHANGED_KIND = "mbk.tabContent.changed";

interface TabContentChangedMessage {
	kind: typeof TAB_CONTENT_CHANGED_KIND;
	at: number;
}

/**
 * Driven adapter that observes browser-platform events (tabs/windows) and
 * content-script mutation pings, and exposes them as a stream of
 * `BrowserStateHint`s consumed by `PublishBrowserStateUseCase`.
 *
 * Works for both Manifest v2 and v3: both use `webextension-polyfill` under
 * the hood. Content-script registration is declarative in each app's
 * manifest.json (see `content_scripts` entries).
 */
@injectable()
export class DrivenBrowserStateSource implements BrowserStateSourceOutputPort {
	private readonly logger;
	private started = false;
	private listeners = new Set<(hint: BrowserStateHint) => void>();
	private disposers: Array<() => void> = [];

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("DrivenBrowserStateSource");
	}

	static setupContainer(
		container: Container,
		serviceIdentifier: symbol = BrowserStateSourceOutputPort,
	): void {
		container
			.bind<BrowserStateSourceOutputPort>(serviceIdentifier)
			.to(DrivenBrowserStateSource);
	}

	onHint = (listener: (hint: BrowserStateHint) => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	start = async (): Promise<void> => {
		if (this.started) {
			return;
		}
		this.started = true;
		this.logger.info("Starting DrivenBrowserStateSource");

		this.registerBrowserEventListeners();

		browser.runtime.onMessage.addListener(this.handleRuntimeMessage);
		this.disposers.push(() => {
			browser.runtime.onMessage.removeListener(this.handleRuntimeMessage);
		});

		// Kick off one `initial` hint so the use case builds its first snapshot
		// via the browser driver. Delivered synchronously after start() resolves.
		Promise.resolve().then(() => {
			this.emit({
				kind: "initial",
			});
		});
	};

	private registerBrowserEventListeners = (): void => {
		this.attachTabListener(
			browser.tabs.onCreated,
			this.emitTabsHint,
			"tabs.onCreated",
		);
		this.attachTabListener(
			browser.tabs.onRemoved,
			this.emitTabsHint,
			"tabs.onRemoved",
		);
		this.attachTabListener(
			browser.tabs.onUpdated,
			this.emitTabsHint,
			"tabs.onUpdated",
		);
		this.attachTabListener(
			browser.tabs.onActivated,
			this.emitTabsHint,
			"tabs.onActivated",
		);
		if (browser.windows) {
			this.attachTabListener(
				browser.windows.onCreated,
				this.emitWindowsHint,
				"windows.onCreated",
			);
			this.attachTabListener(
				browser.windows.onRemoved,
				this.emitWindowsHint,
				"windows.onRemoved",
			);
		}
	};

	private handleRuntimeMessage = (
		message: unknown,
		sender: browser.Runtime.MessageSender,
	): void => {
		if (!this.isTabContentChangedMessage(message)) {
			return;
		}
		const tabId = sender.tab?.id;
		if (tabId === undefined) {
			return;
		}
		this.emit({
			kind: "tabContentChanged",
			tabId: String(tabId),
			at: message.at,
		});
	};

	stop = async (): Promise<void> => {
		if (!this.started) {
			return;
		}
		this.started = false;
		this.logger.info("Stopping DrivenBrowserStateSource");
		for (const dispose of this.disposers) {
			try {
				dispose();
			} catch (error) {
				this.logger.warn("Failed to dispose listener", {
					error,
				});
			}
		}
		this.disposers = [];
		this.listeners.clear();
	};

	private attachTabListener = <TArgs extends unknown[]>(
		event:
			| {
					addListener: (l: (...args: TArgs) => void) => void;
					removeListener: (l: (...args: TArgs) => void) => void;
			  }
			| undefined,
		handler: () => void,
		name: string,
	): void => {
		if (!event) {
			this.logger.verbose(`Listener not available: ${name}`);
			return;
		}
		const listener = () => {
			try {
				handler();
			} catch (error) {
				this.logger.warn(`Listener ${name} threw`, {
					error,
				});
			}
		};
		event.addListener(listener as unknown as (...args: TArgs) => void);
		this.disposers.push(() => {
			event.removeListener(listener as unknown as (...args: TArgs) => void);
		});
	};

	private emitTabsHint = async (): Promise<void> => {
		try {
			const tabs = await browser.tabs.query({});
			const hint: BrowserStateHint = {
				kind: "tabs",
				tabs: tabs.map((tab) => ({
					id: tab.id?.toString() ?? "",
					active: tab.active ?? false,
					title: tab.title ?? "",
					url: tab.url ?? "",
				})),
				activeTabIdByWindow: tabs.reduce<Record<string, string>>((acc, tab) => {
					if (
						tab.active &&
						tab.windowId !== undefined &&
						tab.id !== undefined
					) {
						acc[String(tab.windowId)] = String(tab.id);
					}
					return acc;
				}, {}),
			};
			this.emit(hint);
		} catch (error) {
			this.logger.warn("Failed to assemble tabs hint", {
				error,
			});
		}
	};

	private emitWindowsHint = async (): Promise<void> => {
		try {
			const windows = await browser.windows.getAll();
			this.emit({
				kind: "windows",
				windows: windows.map((w) => ({
					id: w.id?.toString() ?? "",
					focused: w.focused ?? false,
				})),
			});
		} catch (error) {
			this.logger.warn("Failed to assemble windows hint", {
				error,
			});
		}
	};

	private emit = (hint: BrowserStateHint): void => {
		for (const listener of this.listeners) {
			try {
				listener(hint);
			} catch (error) {
				this.logger.warn("Hint listener threw", {
					error,
				});
			}
		}
	};

	private isTabContentChangedMessage = (
		message: unknown,
	): message is TabContentChangedMessage => {
		if (typeof message !== "object" || message === null) {
			return false;
		}
		const m = message as {
			kind?: unknown;
			at?: unknown;
		};
		return m.kind === TAB_CONTENT_CHANGED_KIND && typeof m.at === "number";
	};
}
