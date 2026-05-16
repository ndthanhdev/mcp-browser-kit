import {
	LoggerFactoryOutputPort,
	ObserveBrowserStateInputPort,
} from "@mcp-browser-kit/core-server";
import type {
	BrowserSnapshot,
	BrowserSnapshotTabInfo,
} from "@mcp-browser-kit/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	SubscribeRequestSchema,
	UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { inject, injectable } from "inversify";
import {
	BK_TEMPLATE,
	browserBkUri,
	findWindowIdForTab,
	formatBrowserDescription,
	formatBrowserTitle,
	formatTabDescription,
	formatTabTitle,
	parseBkResourceId,
	pickVariable,
	rankByQuery,
	shortChannelId,
	tabBkUri,
} from "../utils/browser-resource-uris";

const TAB_LIST_CAP = 200;
const COMPLETION_CAP = 100;

interface TabFingerprint {
	title: string;
	url: string;
	active: boolean;
	contentChangedAt: number;
}

interface BrowserFingerprint {
	status: "online" | "offline";
	tabCount: number;
	windowCount: number;
	browserName: string;
}

const tabFingerprintOf = (
	tab: BrowserSnapshotTabInfo,
	snapshot: BrowserSnapshot,
): TabFingerprint => ({
	title: tab.title,
	url: tab.url,
	active: tab.active,
	contentChangedAt: snapshot.contentChangedAt?.[tab.id] ?? 0,
});

const tabFingerprintsEqual = (a: TabFingerprint, b: TabFingerprint): boolean =>
	a.title === b.title &&
	a.url === b.url &&
	a.active === b.active &&
	a.contentChangedAt === b.contentChangedAt;

const browserFingerprintOf = (
	snapshot: BrowserSnapshot,
): BrowserFingerprint => ({
	status: snapshot.status,
	tabCount: snapshot.tabs.length,
	windowCount: snapshot.windows.length,
	browserName: snapshot.browserInfo?.browserName ?? "",
});

const browserFingerprintsEqual = (
	a: BrowserFingerprint,
	b: BrowserFingerprint,
): boolean =>
	a.status === b.status &&
	a.tabCount === b.tabCount &&
	a.windowCount === b.windowCount &&
	a.browserName === b.browserName;

/**
 * Registers browser- and tab-level resources on the MCP server and keeps them
 * in sync with the `ObserveBrowserStateInputPort` by pushing `resourceUpdated`
 * and `resourceListChanged` notifications when the registry changes.
 *
 * Resources exposed via a single `bk:///{+resourceId}` template:
 *   - `bk:///b-<shortId>`             — per-browser state snapshot
 *   - `bk:///b-<shortId>/t-<tabId>`   — per-tab metadata
 *
 * The short browser ID is the nanoid portion of the channelId (everything
 * after the `channel:` prefix). Using a single template with reserved
 * expansion (`+`) means the path variable matches slashes, covering both
 * resource types without leaking the internal `channel:` concept.
 *
 * Notification economy: per-tab and per-browser fingerprints are cached so a
 * snapshot that only changes (e.g.) one tab's url produces exactly one
 * `resourceUpdated` for that tab plus one for its browser — not one per
 * tab in the browser.
 *
 * Completion: a single `completeResourceId` handler returns ranked suggestions
 * for both browser and tab resource IDs, filtered by query against short ID,
 * browser name, tab title, and tab URL.
 */
@injectable()
export class BrowserResources {
	private readonly logger;
	private readonly knownChannelIds = new Set<string>();
	private readonly knownTabsByChannel = new Map<
		string,
		Map<string, TabFingerprint>
	>();
	private readonly knownBrowserFingerprint = new Map<
		string,
		BrowserFingerprint
	>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(ObserveBrowserStateInputPort)
		private readonly observeBrowserState: ObserveBrowserStateInputPort,
	) {
		this.logger = loggerFactory.create("browserResources");
	}

	/**
	 * Register resources on the given MCP server and start pushing live updates
	 * in response to browser-state changes. Returns an unsubscribe function
	 * that detaches the listener and clears internal state.
	 */
	register(server: McpServer): () => void {
		this.logger.verbose("Registering browser resources");

		this.seedKnownState();

		this.registerBkTemplateResource(server);

		// Declare subscription capability and register no-op handlers.
		// The server already broadcasts sendResourceUpdated on every change so
		// no per-URI subscription tracking is needed at this point.
		server.server.registerCapabilities({
			resources: {
				subscribe: true,
			},
		});
		server.server.setRequestHandler(SubscribeRequestSchema, async () => ({}));
		server.server.setRequestHandler(UnsubscribeRequestSchema, async () => ({}));

		const unsubscribe = this.observeBrowserState.onChange((channelId) => {
			try {
				this.handleChange(
					server,
					channelId,
					this.observeBrowserState.getBrowser(channelId),
				);
			} catch (err) {
				this.logger.error("Failed to dispatch resource notifications", {
					channelId,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});

		this.logger.info("Browser resources registered", {
			initialChannels: this.knownChannelIds.size,
		});

		return () => {
			unsubscribe();
			this.knownChannelIds.clear();
			this.knownTabsByChannel.clear();
			this.knownBrowserFingerprint.clear();
			this.logger.verbose("Browser resources unsubscribed");
		};
	}

	private seedKnownState(): void {
		this.knownChannelIds.clear();
		this.knownTabsByChannel.clear();
		this.knownBrowserFingerprint.clear();
		for (const entry of this.observeBrowserState.listBrowsers()) {
			this.knownChannelIds.add(entry.channelId);
			const tabMap = new Map<string, TabFingerprint>();
			for (const tab of entry.snapshot.tabs) {
				tabMap.set(tab.id, tabFingerprintOf(tab, entry.snapshot));
			}
			this.knownTabsByChannel.set(entry.channelId, tabMap);
			this.knownBrowserFingerprint.set(
				entry.channelId,
				browserFingerprintOf(entry.snapshot),
			);
		}
	}

	// ────────────────────────────────────────────────────────────────────────
	// Registration
	// ────────────────────────────────────────────────────────────────────────

	private registerBkTemplateResource(server: McpServer): void {
		server.registerResource(
			"bk",
			new ResourceTemplate(BK_TEMPLATE, {
				list: async () => {
					const entries = this.observeBrowserState.listBrowsers();

					// Browser entries.
					const browserResources = entries.map((entry) => ({
						uri: browserBkUri(entry.channelId),
						name: `b-${shortChannelId(entry.channelId)}`,
						title: formatBrowserTitle(entry.snapshot),
						description: formatBrowserDescription(
							entry.channelId,
							entry.snapshot,
						),
						mimeType: "application/json",
					}));

					// Tab entries — flattened, sorted active-first then by recency.
					const flat: Array<{
						channelId: string;
						tab: BrowserSnapshotTabInfo;
						snapshot: BrowserSnapshot;
						contentChangedAt: number;
					}> = [];
					for (const entry of entries) {
						for (const tab of entry.snapshot.tabs) {
							flat.push({
								channelId: entry.channelId,
								tab,
								snapshot: entry.snapshot,
								contentChangedAt:
									entry.snapshot.contentChangedAt?.[tab.id] ?? entry.lastSeenAt,
							});
						}
					}
					flat.sort((a, b) => {
						if (a.tab.active !== b.tab.active) return a.tab.active ? -1 : 1;
						if (a.contentChangedAt !== b.contentChangedAt)
							return b.contentChangedAt - a.contentChangedAt;
						return formatTabTitle(a.tab).localeCompare(formatTabTitle(b.tab));
					});
					const tabResources = flat
						.slice(0, TAB_LIST_CAP)
						.map(({ channelId, tab, snapshot }) => ({
							uri: tabBkUri(channelId, tab.id),
							name: `b-${shortChannelId(channelId)}/t-${tab.id}`,
							title: formatTabTitle(tab),
							description: formatTabDescription(tab, snapshot),
							mimeType: "application/json",
						}));

					return {
						resources: [
							...browserResources,
							...tabResources,
						],
					};
				},
				complete: {
					resourceId: (value) => this.completeResourceId(value),
				},
			}),
			{
				description:
					"Browser or tab resource. Browser: per-channel state snapshot. Tab: metadata for a single tab (title, url, active state, window, last content change).",
				mimeType: "application/json",
			},
			async (uri, variables) => {
				const resourceId = pickVariable(variables.resourceId);
				if (!resourceId) {
					throw new Error(
						`Invalid bk resource URI (missing resourceId): ${uri.toString()}`,
					);
				}

				const parsed = parseBkResourceId(resourceId, () =>
					this.observeBrowserState.listBrowsers(),
				);
				if (!parsed) {
					throw new Error(
						`Unknown or malformed bk resource ID: ${resourceId} (uri=${uri.toString()})`,
					);
				}

				if (parsed.type === "browser") {
					const entry = this.observeBrowserState.getBrowser(parsed.channelId);
					if (!entry) {
						throw new Error(
							`Browser channel not found: ${parsed.channelId} (uri=${uri.toString()})`,
						);
					}
					return {
						contents: [
							{
								uri: uri.toString(),
								mimeType: "application/json",
								text: JSON.stringify(entry, null, 2),
							},
						],
					};
				}

				// type === "tab"
				const entry = this.observeBrowserState.getBrowser(parsed.channelId);
				if (!entry) {
					throw new Error(
						`Browser channel not found: ${parsed.channelId} (uri=${uri.toString()})`,
					);
				}
				const tab = entry.snapshot.tabs.find((t) => t.id === parsed.tabId);
				if (!tab) {
					throw new Error(
						`Tab not found: ${parsed.tabId} in channel ${parsed.channelId} (uri=${uri.toString()})`,
					);
				}
				const windowId = findWindowIdForTab(entry.snapshot, parsed.tabId);
				const contentChangedAt =
					entry.snapshot.contentChangedAt?.[parsed.tabId] ?? undefined;
				return {
					contents: [
						{
							uri: uri.toString(),
							mimeType: "application/json",
							text: JSON.stringify(
								{
									channelId: parsed.channelId,
									browserInfo: entry.snapshot.browserInfo,
									extensionInfo: entry.snapshot.extensionInfo,
									tab: {
										id: tab.id,
										title: tab.title,
										url: tab.url,
										active: tab.active,
										windowId,
										contentChangedAt,
									},
								},
								null,
								2,
							),
						},
					],
				};
			},
		);
	}

	// ────────────────────────────────────────────────────────────────────────
	// Completion
	// ────────────────────────────────────────────────────────────────────────

	/**
	 * Returns ranked `resourceId` suggestions for both browsers (`b-<shortId>`)
	 * and tabs (`b-<shortId>/t-<tabId>`), scored against the typed query.
	 */
	private completeResourceId(value: string): string[] {
		const entries = this.observeBrowserState.listBrowsers();

		type Candidate = {
			id: string;
			score: number;
			tieBreak: number;
		};
		const candidates: Candidate[] = [];

		for (const entry of entries) {
			const shortId = shortChannelId(entry.channelId);
			const browserName =
				entry.snapshot.browserInfo?.browserName ?? entry.channelId;
			const browserId = `b-${shortId}`;

			const browserScore = Math.min(
				rankByQuery(value, browserId, browserName),
				rankByQuery(value, shortId, browserName),
			);
			candidates.push({
				id: browserId,
				score: browserScore,
				tieBreak: 0,
			});

			for (const tab of entry.snapshot.tabs) {
				const tabId = `${browserId}/t-${tab.id}`;
				const title = formatTabTitle(tab);
				const tabScore = Math.min(
					rankByQuery(value, tabId, title),
					rankByQuery(value, title, tab.url),
					rankByQuery(value, tab.url, title),
				);
				const contentChangedAt =
					entry.snapshot.contentChangedAt?.[tab.id] ?? entry.lastSeenAt;
				const tieBreak = tab.active
					? Number.MAX_SAFE_INTEGER
					: contentChangedAt;
				candidates.push({
					id: tabId,
					score: tabScore,
					tieBreak,
				});
			}
		}

		return candidates
			.filter(({ score }) => Number.isFinite(score))
			.sort((a, b) => {
				if (a.score !== b.score) return a.score - b.score;
				return b.tieBreak - a.tieBreak;
			})
			.slice(0, COMPLETION_CAP)
			.map(({ id }) => id);
	}

	// ────────────────────────────────────────────────────────────────────────
	// Notifications
	// ────────────────────────────────────────────────────────────────────────

	private handleChange(
		server: McpServer,
		channelId: string,
		entry:
			| {
					channelId: string;
					snapshot: BrowserSnapshot;
					lastSeenAt: number;
			  }
			| undefined,
	): void {
		const wasKnown = this.knownChannelIds.has(channelId);
		const prevTabMap =
			this.knownTabsByChannel.get(channelId) ??
			new Map<string, TabFingerprint>();
		const prevBrowserFp = this.knownBrowserFingerprint.get(channelId);

		if (entry === undefined) {
			// Eviction: notify per-tab URIs, then shrink the picker.
			if (wasKnown) {
				this.knownChannelIds.delete(channelId);
			}
			for (const tabId of prevTabMap.keys()) {
				this.safeSendUpdated(server, tabBkUri(channelId, tabId));
			}
			this.knownTabsByChannel.delete(channelId);
			this.knownBrowserFingerprint.delete(channelId);
			if (wasKnown || prevTabMap.size > 0) {
				this.safeSendListChanged(server);
			}
			this.safeSendUpdated(server, browserBkUri(channelId));
			return;
		}

		// Build current tab fingerprint map.
		const currentTabMap = new Map<string, TabFingerprint>();
		for (const tab of entry.snapshot.tabs) {
			currentTabMap.set(tab.id, tabFingerprintOf(tab, entry.snapshot));
		}

		// Detect removed tabs and notify.
		for (const tabId of prevTabMap.keys()) {
			if (!currentTabMap.has(tabId)) {
				this.safeSendUpdated(server, tabBkUri(channelId, tabId));
			}
		}

		// Detect added or changed tabs and notify only those.
		for (const [tabId, fp] of currentTabMap) {
			const prev = prevTabMap.get(tabId);
			if (!prev || !tabFingerprintsEqual(prev, fp)) {
				this.safeSendUpdated(server, tabBkUri(channelId, tabId));
			}
		}

		// Browser-level notification: only if the browser fingerprint changed
		// or this is a newly-known channel.
		const currentBrowserFp = browserFingerprintOf(entry.snapshot);
		const browserFpChanged =
			!prevBrowserFp ||
			!browserFingerprintsEqual(prevBrowserFp, currentBrowserFp);
		if (!wasKnown || browserFpChanged) {
			this.safeSendUpdated(server, browserBkUri(channelId));
		}

		// List-changed: only when the set of channels actually changes.
		if (!wasKnown) {
			this.safeSendListChanged(server);
		}

		// Commit new known state.
		if (!wasKnown) {
			this.knownChannelIds.add(channelId);
		}
		this.knownTabsByChannel.set(channelId, currentTabMap);
		this.knownBrowserFingerprint.set(channelId, currentBrowserFp);
	}

	private safeSendListChanged(server: McpServer): void {
		try {
			server.sendResourceListChanged();
		} catch (err) {
			this.logger.error("sendResourceListChanged failed", {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	private safeSendUpdated(server: McpServer, uri: string): void {
		server.server
			.sendResourceUpdated({
				uri,
			})
			.catch((err) => {
				this.logger.error("sendResourceUpdated failed", {
					uri,
					error: err instanceof Error ? err.message : String(err),
				});
			});
	}
}
