import type { BrowserEvent, BrowserSnapshot } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import {
	ExtensionChannelProviderOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";

const DEFAULT_OFFLINE_TTL_MS = 2 * 60 * 1000;

export interface BrowserStateEntry {
	/** The channel this snapshot is attached to. In v1 the registry is keyed
	 *  by channel rather than by persistent browserId; consumers that need
	 *  the browserId can cross-reference via ExtensionChannelManager. */
	channelId: string;
	snapshot: BrowserSnapshot;
	/** ms epoch when we last received a snapshot or state change. */
	lastSeenAt: number;
}

/**
 * Holds the last-known `BrowserSnapshot` per connected extension channel.
 *
 * Behaviour:
 *   - On every `browserEvent`, replace the entry's snapshot wholesale.
 *     Last-write-wins; out-of-order events are inherently safe because
 *     each event carries a full snapshot.
 *   - On channel `disconnected`, keep the entry but flip `status="offline"`
 *     and stamp `offlineAt`. After `offlineTtlMs`, the entry is evicted.
 *   - On channel `connected`, nothing yet — the extension will publish its
 *     initial snapshot shortly.
 */
@injectable()
export class BrowserStateRegistry {
	readonly name = "BrowserStateRegistry";
	private readonly logger;
	private readonly extensionChannelProvider: ExtensionChannelProviderOutputPort;
	private readonly entries = new Map<string, BrowserStateEntry>();
	private readonly evictionTimers = new Map<
		string,
		ReturnType<typeof setTimeout>
	>();
	private readonly listeners = new Set<(channelId: string) => void>();
	private offlineTtlMs = DEFAULT_OFFLINE_TTL_MS;
	private started = false;

	constructor(
		@inject(ExtensionChannelProviderOutputPort)
		extensionChannelProvider: ExtensionChannelProviderOutputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("BrowserStateRegistry");
		this.extensionChannelProvider = extensionChannelProvider;
	}

	start = (): void => {
		if (this.started) {
			this.logger.verbose("start() called while already started — ignoring");
			return;
		}
		this.extensionChannelProvider.on("browserEvent", this.handleBrowserEvent);
		this.extensionChannelProvider.on("disconnected", this.handleDisconnected);
		this.started = true;
		this.logger.verbose("Started listening for browser events");
	};

	stop = (): void => {
		if (!this.started) {
			return;
		}
		this.extensionChannelProvider.off("browserEvent", this.handleBrowserEvent);
		this.extensionChannelProvider.off("disconnected", this.handleDisconnected);
		for (const timer of this.evictionTimers.values()) {
			clearTimeout(timer);
		}
		this.evictionTimers.clear();
		this.listeners.clear();
		this.started = false;
		this.logger.verbose("Stopped listening for browser events");
	};

	/** Test-only: override the offline TTL. */
	setOfflineTtlMs = (ms: number): void => {
		this.offlineTtlMs = ms;
	};

	listBrowsers = (): BrowserStateEntry[] => {
		return Array.from(this.entries.values());
	};

	getBrowser = (channelId: string): BrowserStateEntry | undefined => {
		return this.entries.get(channelId);
	};

	/**
	 * Register a listener for state changes. Returns an unsubscribe function.
	 *
	 * Listeners fire synchronously after each mutation. Re-entrant calls back
	 * into the registry (e.g. `getBrowser`) observe the post-mutation state.
	 */
	subscribe = (listener: (channelId: string) => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	private emitChange = (channelId: string): void => {
		for (const listener of this.listeners) {
			try {
				listener(channelId);
			} catch (err) {
				this.logger.error("Browser state change listener threw", err);
			}
		}
	};

	private handleBrowserEvent = ({
		channelId,
		event,
	}: {
		channelId: string;
		event: BrowserEvent;
	}): void => {
		if (event.type !== "browserStateChanged") {
			return;
		}

		const { snapshot } = event;

		// Cancel any pending eviction — a fresh snapshot means the browser is
		// healthy again.
		this.cancelEviction(channelId);

		this.entries.set(channelId, {
			channelId,
			snapshot: {
				...snapshot,
				status: "online",
				offlineAt: undefined,
			},
			lastSeenAt: event.at,
		});

		this.logger.info("Browser state updated", {
			channelId,
			tabs: snapshot.tabs.length,
			windows: snapshot.windows.length,
		});

		this.emitChange(channelId);
	};

	private handleDisconnected = ({ channelId }: { channelId: string }): void => {
		const entry = this.entries.get(channelId);
		if (!entry) {
			return;
		}
		const offlineAt = Date.now();
		this.entries.set(channelId, {
			...entry,
			snapshot: {
				...entry.snapshot,
				status: "offline",
				offlineAt,
			},
		});
		this.logger.info("Browser went offline", {
			channelId,
		});

		this.scheduleEviction(channelId);

		this.emitChange(channelId);
	};

	private scheduleEviction = (channelId: string): void => {
		this.cancelEviction(channelId);
		const timer = setTimeout(() => {
			this.evictionTimers.delete(channelId);
			const entry = this.entries.get(channelId);
			if (entry && entry.snapshot.status === "offline") {
				this.entries.delete(channelId);
				this.logger.info("Evicted offline browser", {
					channelId,
				});
				this.emitChange(channelId);
			}
		}, this.offlineTtlMs);
		// Don't keep the process alive just for eviction.
		if (typeof timer === "object" && timer && "unref" in timer) {
			(
				timer as {
					unref?: () => void;
				}
			).unref?.();
		}
		this.evictionTimers.set(channelId, timer);
	};

	private cancelEviction = (channelId: string): void => {
		const timer = this.evictionTimers.get(channelId);
		if (timer) {
			clearTimeout(timer);
			this.evictionTimers.delete(channelId);
		}
	};
}
