import {
	LoggerFactoryOutputPort,
	ObserveBrowserStateInputPort,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
	SnapshotContentInputPort,
	type SnapshotContentInputPort as SnapshotContentInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
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
	CONTEXT_URI,
	findWindowIdForTab,
	formatBrowserTitle,
	formatTabTitle,
	parseBkResourceId,
	pickVariable,
	rankByQuery,
	shortChannelId,
	tabBkUri,
	tabReadableElementsBkUri,
	tabReadableTextBkUri,
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
 * Static resource:
 *   - `bk:///context`  — aggregated snapshot of all browsers, windows, and
 *                         tabs including their tool-call keys; always present
 *                         and updated on every browser state change.
 *
 * Template resources via `bk:///{+resourceId}`:
 *   - `bk:///browsers/<shortId>`                               — per-browser snapshot
 *   - `bk:///browsers/<shortId>/tabs/<tabId>`                  — per-tab metadata
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-text`    — tab inner text
 *   - `bk:///browsers/<shortId>/tabs/<tabId>/readable-elements`— tab element list
 *
 * Notification economy: per-tab and per-browser fingerprints are cached so a
 * snapshot that only changes (e.g.) one tab's url produces exactly one
 * `resourceUpdated` for that tab plus one for its browser — not one per tab.
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
		@inject(SnapshotContentInputPort)
		private readonly snapshotContent: SnapshotContentInputPortInterface,
		@inject(McpDescriptionsInputPort)
		private readonly mcpDescriptions: McpDescriptionsInputPortInterface,
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

		this.registerContextResource(server);
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

	private registerContextResource(server: McpServer): void {
		server.registerResource(
			"context",
			CONTEXT_URI,
			{
				title: "Browser Context",
				description: this.mcpDescriptions.contextResourceDescription(),
				mimeType: "application/json",
			},
			async (uri) => this.readContextResource(uri),
		);
	}

	private registerBkTemplateResource(server: McpServer): void {
		server.registerResource(
			"bk",
			new ResourceTemplate(BK_TEMPLATE, {
				list: async () => this.listBkResources(),
				complete: {
					resourceId: (value) => this.completeResourceId(value),
				},
			}),
			{
				description: this.mcpDescriptions.bkResourceTemplateDescription(),
				mimeType: "application/json",
			},
			async (uri, variables) => this.readBkResource(uri, variables),
		);
	}

	private listBkResources(): {
		resources: Array<{
			uri: string;
			name: string;
			title?: string;
			description?: string;
			mimeType: string;
		}>;
	} {
		const entries = this.observeBrowserState.listBrowsers();

		const browserResources = entries.map((entry) => ({
			uri: browserBkUri(entry.channelId),
			name: `browsers/${shortChannelId(entry.channelId)}`,
			title: formatBrowserTitle(entry.snapshot),
			description: this.mcpDescriptions.browserResourceDescription(
				entry.snapshot.tabs.length,
				entry.snapshot.windows.length,
				shortChannelId(entry.channelId),
			),
			mimeType: "application/json",
		}));

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
		const cappedFlat = flat.slice(0, TAB_LIST_CAP);

		const tabResources = cappedFlat.map(({ channelId, tab, snapshot }) => ({
			uri: tabBkUri(channelId, tab.id),
			name: `browsers/${shortChannelId(channelId)}/tabs/${tab.id}`,
			title: formatTabTitle(tab),
			description: this.mcpDescriptions.tabResourceDescription(
				tab.url,
				snapshot.browserInfo?.browserName?.trim() || "browser",
				tab.active,
			),
			mimeType: "application/json",
		}));

		const tabReadableTextResources = cappedFlat.map(({ channelId, tab }) => ({
			uri: tabReadableTextBkUri(channelId, tab.id),
			name: `browsers/${shortChannelId(channelId)}/tabs/${tab.id}/readable-text`,
			title: `${formatTabTitle(tab)} — readable text snapshot`,
			description: this.mcpDescriptions.tabReadableTextDescription(tab.id),
			mimeType: "application/json",
		}));

		const tabReadableElementsResources = cappedFlat.map(
			({ channelId, tab }) => ({
				uri: tabReadableElementsBkUri(channelId, tab.id),
				name: `browsers/${shortChannelId(channelId)}/tabs/${tab.id}/readable-elements`,
				title: `${formatTabTitle(tab)} — readable elements snapshot`,
				description: this.mcpDescriptions.tabReadableElementsDescription(
					tab.id,
				),
				mimeType: "application/json",
			}),
		);

		return {
			resources: [
				...browserResources,
				...tabResources,
				...tabReadableTextResources,
				...tabReadableElementsResources,
			],
		};
	}

	private readContextResource(uri: URL): {
		contents: Array<{
			uri: string;
			mimeType: string;
			text: string;
		}>;
	} {
		const entries = this.observeBrowserState.listBrowsers();

		const browsers = entries.map((entry) => {
			const { snapshot, channelId } = entry;
			const extensionId = snapshot.extensionInfo?.extensionId ?? "";

			const windows = snapshot.windows.map((w) => ({
				id: w.id,
				focused: w.focused,
				windowKey: extensionId ? `${extensionId}::${w.id}` : undefined,
			}));

			const tabs = snapshot.tabs.map((tab) => {
				const windowId = tab.windowId ?? findWindowIdForTab(snapshot, tab.id);
				return {
					id: tab.id,
					windowId,
					url: tab.url,
					title: tab.title,
					active: tab.active,
					tabUri: tabBkUri(channelId, tab.id),
					tabKey:
						extensionId && windowId
							? `${extensionId}::${windowId}::${tab.id}`
							: undefined,
					windowKey:
						extensionId && windowId ? `${extensionId}::${windowId}` : undefined,
				};
			});

			return {
				channelId,
				browserId: extensionId,
				status: snapshot.status,
				browserInfo: snapshot.browserInfo,
				extensionInfo: snapshot.extensionInfo,
				windows,
				tabs,
			};
		});

		return {
			contents: [
				{
					uri: uri.toString(),
					mimeType: "application/json",
					text: JSON.stringify(
						{
							browsers,
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async readBkResource(
		uri: URL,
		variables: Record<string, string | string[]>,
	): Promise<{
		contents: Array<{
			uri: string;
			mimeType: string;
			text: string;
		}>;
	}> {
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

		if (parsed.type === "snapshot-page") {
			const result = await this.snapshotContent.getSnapshotPage(
				parsed.snapshotId,
				parsed.contentType,
				parsed.pageNumber,
			);
			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
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
		if (parsed.type === "tab-readable-text") {
			this.assertTabOnline(entry.snapshot, uri);
			const result = await this.snapshotContent.getReadableTextPage(
				parsed.channelId,
				parsed.tabId,
				1,
			);
			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		}

		if (parsed.type === "tab-readable-elements") {
			this.assertTabOnline(entry.snapshot, uri);
			const result = await this.snapshotContent.getReadableElementsPage(
				parsed.channelId,
				parsed.tabId,
				1,
			);
			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
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
	}

	private assertTabOnline(snapshot: BrowserSnapshot, uri: URL): void {
		if (snapshot.status === "offline") {
			throw new Error(`Browser is offline (uri=${uri.toString()})`);
		}
	}

	// ────────────────────────────────────────────────────────────────────────
	// Completion
	// ────────────────────────────────────────────────────────────────────────

	/**
	 * Returns ranked `resourceId` suggestions for browsers and tabs,
	 * scored against the typed query.
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
			const browserId = `browsers/${shortId}`;

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
				const tabId = `${browserId}/tabs/${tab.id}`;
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
			this.handleEviction(server, channelId, wasKnown, prevTabMap);
			return;
		}

		const currentTabMap = this.buildTabMap(entry.snapshot);
		this.notifyTabChanges(server, channelId, prevTabMap, currentTabMap);

		const currentBrowserFp = browserFingerprintOf(entry.snapshot);
		const browserFpChanged = !(
			prevBrowserFp && browserFingerprintsEqual(prevBrowserFp, currentBrowserFp)
		);
		if (!wasKnown || browserFpChanged) {
			this.safeSendUpdated(server, browserBkUri(channelId));
			this.safeSendUpdated(server, CONTEXT_URI);
		}
		if (!wasKnown) {
			this.safeSendListChanged(server);
			this.knownChannelIds.add(channelId);
		}
		this.knownTabsByChannel.set(channelId, currentTabMap);
		this.knownBrowserFingerprint.set(channelId, currentBrowserFp);
	}

	private handleEviction(
		server: McpServer,
		channelId: string,
		wasKnown: boolean,
		prevTabMap: Map<string, TabFingerprint>,
	): void {
		if (wasKnown) {
			this.knownChannelIds.delete(channelId);
		}
		this.snapshotContent.invalidateCache(channelId);
		for (const tabId of prevTabMap.keys()) {
			this.safeSendUpdated(server, tabBkUri(channelId, tabId));
			this.safeSendUpdated(server, tabReadableTextBkUri(channelId, tabId));
			this.safeSendUpdated(server, tabReadableElementsBkUri(channelId, tabId));
		}
		this.knownTabsByChannel.delete(channelId);
		this.knownBrowserFingerprint.delete(channelId);
		if (wasKnown || prevTabMap.size > 0) {
			this.safeSendListChanged(server);
		}
		this.safeSendUpdated(server, browserBkUri(channelId));
		this.safeSendUpdated(server, CONTEXT_URI);
	}

	private buildTabMap(snapshot: BrowserSnapshot): Map<string, TabFingerprint> {
		const tabMap = new Map<string, TabFingerprint>();
		for (const tab of snapshot.tabs) {
			tabMap.set(tab.id, tabFingerprintOf(tab, snapshot));
		}
		return tabMap;
	}

	private notifyTabChanges(
		server: McpServer,
		channelId: string,
		prevTabMap: Map<string, TabFingerprint>,
		currentTabMap: Map<string, TabFingerprint>,
	): void {
		for (const tabId of prevTabMap.keys()) {
			if (!currentTabMap.has(tabId)) {
				this.snapshotContent.invalidateCache(channelId, tabId);
				this.safeSendUpdated(server, tabBkUri(channelId, tabId));
				this.safeSendUpdated(server, tabReadableTextBkUri(channelId, tabId));
				this.safeSendUpdated(
					server,
					tabReadableElementsBkUri(channelId, tabId),
				);
				this.safeSendUpdated(server, CONTEXT_URI);
			}
		}
		for (const [tabId, fp] of currentTabMap) {
			const prev = prevTabMap.get(tabId);
			if (!(prev && tabFingerprintsEqual(prev, fp))) {
				this.snapshotContent.invalidateCache(channelId, tabId);
				this.safeSendUpdated(server, tabBkUri(channelId, tabId));
				this.safeSendUpdated(server, tabReadableTextBkUri(channelId, tabId));
				this.safeSendUpdated(
					server,
					tabReadableElementsBkUri(channelId, tabId),
				);
				this.safeSendUpdated(server, CONTEXT_URI);
			}
		}
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
