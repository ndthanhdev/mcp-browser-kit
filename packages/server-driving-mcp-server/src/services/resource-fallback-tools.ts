import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
	ObserveBrowserStateInputPort,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
	SnapshotContentInputPort,
	type SnapshotContentInputPort as SnapshotContentInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
import { shortChannelId } from "@mcp-browser-kit/core-utils";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inject, injectable } from "inversify";
import { over } from "ok-value-error-reason";
import { findWindowIdForTab, tabBkUri } from "../utils/browser-resource-uris";
import {
	snapshotPageSchema,
	tabReadableElementHtmlSchema,
	tabReadRefSchema,
} from "../utils/tool-schemas";

/**
 * Fallback MCP tools that expose the same data as the bk:/// resources.
 * Intended for AI clients that don't support MCP resource templates.
 */
@injectable()
export class ResourceFallbackTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ObserveBrowserStateInputPort)
		private readonly observeBrowserState: ObserveBrowserStateInputPort,
		@inject(SnapshotContentInputPort)
		private readonly snapshotContent: SnapshotContentInputPortInterface,
		@inject(McpDescriptionsInputPort)
		private readonly mcpDescriptions: McpDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("resourceFallbackTools");
	}

	register(server: McpServer): void {
		this.registerGetContext(server);
		this.registerGetReadableText(server);
		this.registerGetReadableElements(server);
		this.registerGetReadableElementHtml(server);
		this.registerGetSnapshotPage(server);
	}

	private registerGetContext(server: McpServer): void {
		this.logger.verbose("Registering tool: getContext");
		server.registerTool(
			"getContext",
			{
				title: "Get browser context",
				description: this.mcpDescriptions.getContextInstruction(),
				inputSchema: {},
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async () => {
				this.logger.info("Executing getContext");
				const overResult = await over(() => this.buildContext());

				if (!overResult.ok) {
					this.logger.error("Failed to get context", {
						reason: overResult.reason,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										ok: false,
										reason: String(overResult.reason),
									},
									null,
									2,
								),
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(overResult.value, null, 2),
						},
					],
				};
			},
		);
	}

	private registerGetReadableText(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableText");
		server.registerTool(
			"getReadableText",
			{
				title: "Get readable text",
				description: this.mcpDescriptions.getReadableTextInstruction(),
				inputSchema: tabReadRefSchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ browserId, tabId }) => {
				this.logger.info("Executing getReadableText", {
					browserId,
					tabId,
				});
				const overResult = await over(async () => {
					const channelId = this.resolveChannelId(browserId);
					return this.snapshotContent.getReadableTextPage(channelId, tabId, 1);
				});

				if (!overResult.ok) {
					this.logger.error("Failed to get readable text", {
						browserId,
						tabId,
						reason: overResult.reason,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										ok: false,
										reason: String(overResult.reason),
									},
									null,
									2,
								),
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(overResult.value, null, 2),
						},
					],
				};
			},
		);
	}

	private registerGetReadableElements(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableElements");
		server.registerTool(
			"getReadableElements",
			{
				title: "Get readable elements",
				description: this.mcpDescriptions.getReadableElementsInstruction(),
				inputSchema: tabReadRefSchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ browserId, tabId }) => {
				this.logger.info("Executing getReadableElements", {
					browserId,
					tabId,
				});
				const overResult = await over(async () => {
					const channelId = this.resolveChannelId(browserId);
					return this.snapshotContent.getReadableElementsPage(
						channelId,
						tabId,
						1,
					);
				});

				if (!overResult.ok) {
					this.logger.error("Failed to get readable elements", {
						browserId,
						tabId,
						reason: overResult.reason,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										ok: false,
										reason: String(overResult.reason),
									},
									null,
									2,
								),
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(overResult.value, null, 2),
						},
					],
				};
			},
		);
	}

	private registerGetReadableElementHtml(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableElementHtml");
		server.registerTool(
			"getReadableElementHtml",
			{
				title: "Get readable element HTML",
				description: this.mcpDescriptions.getReadableElementHtmlInstruction(),
				inputSchema: tabReadableElementHtmlSchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ browserId, tabId, readablePath }) => {
				this.logger.info("Executing getReadableElementHtml", {
					browserId,
					tabId,
					readablePath,
				});
				const overResult = await over(async () => {
					const channelId = this.resolveChannelId(browserId);
					return this.snapshotContent.getReadableElementHtmlPage(
						channelId,
						tabId,
						readablePath,
						1,
					);
				});

				if (!overResult.ok) {
					this.logger.error("Failed to get readable element HTML", {
						browserId,
						tabId,
						readablePath,
						reason: overResult.reason,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										ok: false,
										reason: String(overResult.reason),
									},
									null,
									2,
								),
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(overResult.value, null, 2),
						},
					],
				};
			},
		);
	}

	private registerGetSnapshotPage(server: McpServer): void {
		this.logger.verbose("Registering tool: getSnapshotPage");
		server.registerTool(
			"getSnapshotPage",
			{
				title: "Get snapshot page",
				description: this.mcpDescriptions.getSnapshotPageInstruction(),
				inputSchema: snapshotPageSchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ snapshotId, type, pageNumber }) => {
				this.logger.info("Executing getSnapshotPage", {
					snapshotId,
					type,
					pageNumber,
				});
				const overResult = await over(() =>
					this.snapshotContent.getSnapshotPage(snapshotId, type, pageNumber),
				);

				if (!overResult.ok) {
					this.logger.error("Failed to get snapshot page", {
						snapshotId,
						type,
						pageNumber,
						reason: overResult.reason,
					});
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										ok: false,
										reason: String(overResult.reason),
									},
									null,
									2,
								),
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(overResult.value, null, 2),
						},
					],
				};
			},
		);
	}

	/**
	 * Builds the same aggregated context shape as the `bk:///context` resource.
	 */
	private buildContext() {
		const entries = this.observeBrowserState
			.listBrowsers()
			.filter((e) => e.snapshot.status !== "offline");

		if (entries.length === 0) {
			throw new Error(
				"No browser connected. Please make sure you have installed a suitable browser extension version and that it is enabled.",
			);
		}

		const browsers = entries.map((entry) => {
			const { snapshot, channelId } = entry;
			const browserId = shortChannelId(channelId);

			const windows = snapshot.windows.map((w) => ({
				id: w.id,
				focused: w.focused,
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
				};
			});

			return {
				browserId,
				status: snapshot.status,
				browserInfo: snapshot.browserInfo,
				extensionInfo: snapshot.extensionInfo,
				windows,
				tabs,
			};
		});

		return {
			browsers,
		};
	}

	/**
	 * Resolves a `browserId` (the short channel id) to the full `channelId`
	 * needed by `SnapshotContentInputPort`.
	 */
	private resolveChannelId(browserId: string): string {
		const entries = this.observeBrowserState.listBrowsers();
		const match = entries.find(
			(e) => shortChannelId(e.channelId) === browserId,
		);
		if (!match) {
			throw new Error(`No browser found for browserId: ${browserId}`);
		}

		return match.channelId;
	}
}
