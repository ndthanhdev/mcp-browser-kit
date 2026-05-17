import type {
	BrowserEvent,
	BrowserSnapshot,
	BrowserSnapshotTabInfo,
	BrowserSnapshotWindowInfo,
} from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import type { PublishBrowserStateInputPort } from "../input-ports";
import {
	BrowserDriverOutputPort,
	type BrowserStateHint,
	BrowserStateSourceOutputPort,
	LoggerFactoryOutputPort,
	ServerEventSinkOutputPort,
} from "../output-ports";

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Observes local browser state via `BrowserStateSourceOutputPort`, assembles a
 * single authoritative `BrowserSnapshot`, and publishes a
 * `browserStateChanged` event over every active server channel via
 * `ServerEventSinkOutputPort`.
 *
 * Cadence:
 *   - Debounced `DEFAULT_DEBOUNCE_MS` to coalesce bursts (tab-update storms,
 *     content-mutation pings).
 *   - Flushes immediately on first publish and on `status` transitions so
 *     consumers never wait for the debounce window to learn about
 *     online/offline changes.
 *
 * Last-event-wins: only the latest snapshot is ever in flight or buffered.
 */
@injectable()
export class PublishBrowserStateUseCase
	implements PublishBrowserStateInputPort
{
	private readonly logger;

	private snapshot: BrowserSnapshot | null = null;
	private unsubscribeHints: (() => void) | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private debounceMs = DEFAULT_DEBOUNCE_MS;
	private publishInFlight = false;
	private pendingPublish = false;
	private started = false;
	/**
	 * Hints that arrive after `start()` resolves but before the initial
	 * `rebuildSnapshot` call completes. Drained and replayed once the
	 * snapshot exists so we don't silently lose a tab event that races the
	 * startup rebuild. `initial` hints are skipped during drain — the initial
	 * rebuild already covered them.
	 */
	private pendingHints: BrowserStateHint[] = [];

	constructor(
		@inject(BrowserDriverOutputPort)
		private readonly browserDriver: BrowserDriverOutputPort,
		@inject(BrowserStateSourceOutputPort)
		private readonly stateSource: BrowserStateSourceOutputPort,
		@inject(ServerEventSinkOutputPort)
		private readonly sink: ServerEventSinkOutputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("PublishBrowserStateUseCase");
	}

	start = async (): Promise<void> => {
		if (this.started) {
			this.logger.warn("Already started");
			return;
		}
		this.started = true;

		this.logger.info("Starting browser-state publisher");
		await this.stateSource.start();
		this.unsubscribeHints = this.stateSource.onHint(this.handleHint);

		// Build the initial snapshot synchronously (from the driver) and flush
		// immediately so the server sees a fresh state as soon as we connect.
		await this.rebuildSnapshot("online");

		// Drain any hints that arrived while we were rebuilding. Skip
		// `initial` — the rebuild we just did covers it.
		if (this.pendingHints.length > 0) {
			const drained = this.pendingHints;
			this.pendingHints = [];
			this.logger.verbose("Draining pending hints received during startup", {
				count: drained.length,
			});
			for (const hint of drained) {
				if (hint.kind === "initial") continue;
				this.handleHint(hint);
			}
		}

		this.flushNow();
	};

	stop = async (): Promise<void> => {
		if (!this.started) {
			return;
		}
		this.started = false;
		this.logger.info("Stopping browser-state publisher");

		if (this.unsubscribeHints) {
			this.unsubscribeHints();
			this.unsubscribeHints = null;
		}
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		this.pendingHints = [];
		await this.stateSource.stop();
	};

	/** Test-only: override the debounce window. */
	setDebounceMs = (ms: number): void => {
		this.debounceMs = ms;
	};

	/** Test-only: return the currently-held snapshot. */
	getSnapshot = (): BrowserSnapshot | null => {
		return this.snapshot;
	};

	private handleHint: Parameters<BrowserStateSourceOutputPort["onHint"]>[0] = (
		hint,
	) => {
		if (!this.snapshot) {
			// Queue until the initial snapshot is built; we'll drain in
			// `start()` right after `rebuildSnapshot` resolves. This replaces
			// an earlier "drop silently" behaviour that risked losing tab
			// events that raced startup.
			this.pendingHints.push(hint);
			this.logger.verbose(
				"Queueing hint received before initial snapshot",
				hint,
			);
			return;
		}

		switch (hint.kind) {
			case "initial":
				this.rebuildSnapshot("online").catch((error) => {
					this.logger.error("Failed to rebuild snapshot on 'initial' hint", {
						error,
					});
				});
				return;
			case "windows":
				this.snapshot = {
					...this.snapshot,
					windows: hint.windows,
				};
				break;
			case "tabs":
				this.snapshot = {
					...this.snapshot,
					tabs: hint.tabs,
					activeTabIdByWindow: hint.activeTabIdByWindow,
				};
				break;
			case "tabContentChanged":
				this.snapshot = {
					...this.snapshot,
					contentChangedAt: {
						...this.snapshot.contentChangedAt,
						[hint.tabId]: hint.at,
					},
				};
				break;
			default: {
				const _exhaustive: never = hint;
				// biome-ignore lint/complexity/noVoid: intentional exhaustive check
				void _exhaustive;
			}
		}

		this.scheduleDebounced();
	};

	private rebuildSnapshot = async (
		status: BrowserSnapshot["status"],
	): Promise<void> => {
		try {
			const [browserInfo, extensionInfo, windowsRaw, tabsRaw] =
				await Promise.all([
					this.browserDriver.getBrowserInfo(),
					this.browserDriver.getExtensionInfo(),
					this.browserDriver.getWindows(),
					this.browserDriver.getTabs(),
				]);

			const windows: BrowserSnapshotWindowInfo[] = windowsRaw.map((w) => ({
				id: w.id,
				focused: w.focused,
			}));
			const tabs: BrowserSnapshotTabInfo[] = tabsRaw.map((t) => ({
				id: t.id,
				active: t.active,
				title: t.title,
				url: t.url,
			}));

			const activeTabIdByWindow: Record<string, string> = {};
			for (const tab of tabsRaw) {
				if (tab.active) {
					// BrowserDriverOutputPort's ExtensionTabInfo does not carry
					// windowId today, so fall back to the first focused window if
					// multiple actives collide. This is best-effort; the richer
					// browser-state-source adapter provides windowId via the
					// `tabs` hint.
					const focused = windows.find((w) => w.focused);
					if (focused) {
						activeTabIdByWindow[focused.id] = tab.id;
					}
				}
			}

			this.snapshot = {
				status,
				browserInfo,
				extensionInfo,
				windows,
				tabs,
				activeTabIdByWindow,
				contentChangedAt: this.snapshot?.contentChangedAt ?? {},
			};
		} catch (error) {
			this.logger.error("Failed to rebuild snapshot", {
				error,
			});
		}
	};

	private scheduleDebounced = (): void => {
		if (this.debounceTimer) {
			return;
		}
		this.debounceTimer = setTimeout(async () => {
			this.debounceTimer = null;
			await this.publishCurrent();
		}, this.debounceMs);
	};

	private flushNow = async (): Promise<void> => {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		await this.publishCurrent();
	};

	private publishCurrent = async (): Promise<void> => {
		if (!this.snapshot) {
			return;
		}
		if (this.publishInFlight) {
			// Coalesce: remember that more work came in while the last publish
			// was running; we will republish the latest snapshot when it
			// settles. Last-event-wins.
			this.pendingPublish = true;
			return;
		}

		this.publishInFlight = true;
		const event: BrowserEvent = {
			type: "browserStateChanged",
			at: Date.now(),
			snapshot: this.snapshot,
		};

		try {
			await this.sink.publish(event);
		} catch (error) {
			// Drop + log. Next mutation will republish the current state.
			this.logger.warn("Failed to publish browser-state event", {
				error,
			});
		} finally {
			this.publishInFlight = false;
			if (this.pendingPublish) {
				this.pendingPublish = false;
				this.scheduleDebounced();
			}
		}
	};
}
