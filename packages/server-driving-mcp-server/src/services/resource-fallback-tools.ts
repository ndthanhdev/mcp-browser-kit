import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
	ObserveBrowserStateInputPort,
	TabKey,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
	SnapshotContentInputPort,
	type SnapshotContentInputPort as SnapshotContentInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inject, injectable } from "inversify";
import { over } from "ok-value-error-reason";
import { findWindowIdForTab, tabBkUri } from "../utils/browser-resource-uris";
import { snapshotPageSchema, tabKeySchema } from "../utils/tool-schemas";

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
				inputSchema: tabKeySchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ tabKey }) => {
				this.logger.info("Executing getReadableText", {
					tabKey,
				});
				const overResult = await over(async () => {
					const { channelId, tabId } = this.resolveTabKey(tabKey);
					return this.snapshotContent.getReadableTextPage(channelId, tabId, 1);
				});

				if (!overResult.ok) {
					this.logger.error("Failed to get readable text", {
						tabKey,
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
				inputSchema: tabKeySchema,
				annotations: {
					readOnlyHint: true,
					openWorldHint: true,
				},
			},
			async ({ tabKey }) => {
				this.logger.info("Executing getReadableElements", {
					tabKey,
				});
				const overResult = await over(async () => {
					const { channelId, tabId } = this.resolveTabKey(tabKey);
					return this.snapshotContent.getReadableElementsPage(
						channelId,
						tabId,
						1,
					);
				});

				if (!overResult.ok) {
					this.logger.error("Failed to get readable elements", {
						tabKey,
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
			browsers,
		};
	}

	/**
	 * Resolves a `tabKey` (extensionId::windowId::tabId) to the corresponding
	 * `channelId` and `tabId` needed by `SnapshotContentInputPort`.
	 */
	private resolveTabKey(tabKey: string): {
		channelId: string;
		tabId: string;
	} {
		const parsed = TabKey.parse(tabKey);

		const entries = this.observeBrowserState.listBrowsers();
		const match = entries.find(
			(e) => e.snapshot.extensionInfo?.extensionId === parsed.extensionId,
		);
		if (!match) {
			throw new Error(
				`No browser found for extensionId: ${parsed.extensionId} (from tabKey: ${tabKey})`,
			);
		}

		return {
			channelId: match.channelId,
			tabId: parsed.tabId,
		};
	}
}
