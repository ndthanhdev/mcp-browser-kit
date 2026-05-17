import type {
	ServerToolArgs,
	ServerToolName,
} from "@mcp-browser-kit/core-server";
import {
	BrowserStateRegistry,
	createCoreServerContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenLoggerFactoryConsolaError } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import type {
	McpToolName,
	ServerToolOverResult,
} from "@mcp-browser-kit/server-driving-mcp-server";
import { ServerDrivingMcpServer } from "@mcp-browser-kit/server-driving-mcp-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
	type CallToolResult,
	CallToolResultSchema,
	EmptyResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ListToolsResultSchema,
	type ReadResourceResult,
	ReadResourceResultSchema,
	ResourceListChangedNotificationSchema,
	ResourceUpdatedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Page } from "@playwright/test";

export type TypedCallToolResult<T extends McpToolName> = Omit<
	CallToolResult,
	"structuredContent"
> & {
	structuredContent?: ServerToolOverResult<T>;
};

export class McpClientPageObject {
	private client: Client;
	private clientTransport:
		| ReturnType<typeof InMemoryTransport.createLinkedPair>[0]
		| null = null;
	private serverTransport:
		| ReturnType<typeof InMemoryTransport.createLinkedPair>[1]
		| null = null;
	private mcpServer: ServerDrivingMcpServer | null = null;
	private trpcServer: ServerDrivenTrpcChannelProvider | null = null;
	private browserStateLifecycle: BrowserStateRegistry | null = null;
	private readonly updatedNotifications: {
		uri: string;
		receivedAt: number;
	}[] = [];
	private readonly listChangedNotifications: {
		receivedAt: number;
	}[] = [];

	constructor() {
		this.client = new Client({
			name: "e2e-test-client",
			version: "1.0.0",
		});
		this.client.setNotificationHandler(
			ResourceUpdatedNotificationSchema,
			async (notification) => {
				this.updatedNotifications.push({
					uri: notification.params.uri,
					receivedAt: Date.now(),
				});
			},
		);
		this.client.setNotificationHandler(
			ResourceListChangedNotificationSchema,
			async () => {
				this.listChangedNotifications.push({
					receivedAt: Date.now(),
				});
			},
		);
	}

	async startServer() {
		const container = createCoreServerContainer();

		DrivenLoggerFactoryConsolaError.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);
		ServerDrivenTrpcChannelProvider.setupContainer(container);
		ServerDrivingMcpServer.setupContainer(container);

		this.browserStateLifecycle =
			container.get<BrowserStateRegistry>(BrowserStateRegistry);
		this.browserStateLifecycle.start();

		this.trpcServer = container.get<ServerDrivenTrpcChannelProvider>(
			ServerDrivenTrpcChannelProvider,
		);
		await this.trpcServer.start();

		this.mcpServer = container.get<ServerDrivingMcpServer>(
			ServerDrivingMcpServer,
		);
		await this.mcpServer.initMcpServer();
	}

	async connect() {
		if (!this.mcpServer) {
			throw new Error("MCP server not started. Call startServer() first.");
		}

		const server = this.mcpServer.getServer();
		if (!server) {
			throw new Error("MCP server instance not initialized.");
		}

		[this.clientTransport, this.serverTransport] =
			InMemoryTransport.createLinkedPair();

		await Promise.all([
			server.connect(this.serverTransport),
			this.client.connect(this.clientTransport),
		]);
	}

	async disconnect() {
		await this.client.close();
		await this.trpcServer?.stop();
		this.browserStateLifecycle?.stop();
		this.browserStateLifecycle = null;
	}

	async listTools() {
		const res = await this.client.request(
			{
				method: "tools/list",
				params: {},
			},
			ListToolsResultSchema,
		);
		return res.tools;
	}

	async callTool<T extends McpToolName & ServerToolName>(
		name: T,
		...args: keyof ServerToolArgs<T> extends never
			? []
			: [
					args: ServerToolArgs<T>,
				]
	): Promise<TypedCallToolResult<T>> {
		const res = await this.client.request(
			{
				method: "tools/call",
				params: {
					name,
					arguments: args[0] ?? {},
				},
			},
			CallToolResultSchema,
		);
		return res as TypedCallToolResult<T>;
	}

	async listResources() {
		const res = await this.client.request(
			{
				method: "resources/list",
				params: {},
			},
			ListResourcesResultSchema,
		);
		return res.resources;
	}

	async listResourceTemplates() {
		const res = await this.client.request(
			{
				method: "resources/templates/list",
				params: {},
			},
			ListResourceTemplatesResultSchema,
		);
		return res.resourceTemplates;
	}

	async readResource(uri: string): Promise<{
		result: ReadResourceResult;
		json: unknown;
	}> {
		const result = await this.client.request(
			{
				method: "resources/read",
				params: {
					uri,
				},
			},
			ReadResourceResultSchema,
		);
		const first = result.contents[0];
		let json: unknown;
		if (first && "text" in first && typeof first.text === "string") {
			try {
				json = JSON.parse(first.text);
			} catch {
				json = undefined;
			}
		}
		return {
			result,
			json,
		};
	}

	async readResourceText(uri: string): Promise<string> {
		const result = await this.client.request(
			{
				method: "resources/read",
				params: {
					uri,
				},
			},
			ReadResourceResultSchema,
		);
		const first = result.contents[0];
		return first && "text" in first ? String(first.text) : "";
	}

	async subscribeResource(uri: string) {
		await this.client.request(
			{
				method: "resources/subscribe",
				params: {
					uri,
				},
			},
			EmptyResultSchema,
		);
	}

	clearResourceNotifications() {
		this.updatedNotifications.length = 0;
		this.listChangedNotifications.length = 0;
	}

	getUpdatedNotifications() {
		return [
			...this.updatedNotifications,
		];
	}

	getListChangedNotifications() {
		return [
			...this.listChangedNotifications,
		];
	}

	async waitForResourceUpdated(uri: string, timeout = 10000) {
		const { expect } = await import("@playwright/test");
		await expect(() => {
			expect(
				this.updatedNotifications.some((n) => n.uri === uri),
				`expected resources/updated notification for ${uri}`,
			).toBe(true);
		}).toPass({
			timeout,
			intervals: [
				250,
			],
		});
	}

	async waitForResourceListChanged(timeout = 10000) {
		const { expect } = await import("@playwright/test");
		await expect(() => {
			expect(
				this.listChangedNotifications.length,
				"expected a resources/list_changed notification",
			).toBeGreaterThan(0);
		}).toPass({
			timeout,
			intervals: [
				250,
			],
		});
	}

	async waitForBrowsers(timeout = 20000) {
		const { expect } = await import("@playwright/test");
		await expect(async () => {
			const resources = await this.listResources();
			expect(
				resources.some(
					(r) => r.uri.startsWith("bk:///b-") && !r.uri.includes("/t-"),
				),
			).toBe(true);
		}).toPass({
			timeout,
			intervals: [
				2000,
			],
		});
	}

	async waitForTabByUrl(
		page: Page,
		urlPattern: string,
		timeout = 10000,
	): Promise<string> {
		const { expect } = await import("@playwright/test");
		await page.waitForURL(`**/*${urlPattern}*`, {
			timeout,
		});
		await page.waitForLoadState("networkidle");
		let tabKey = "";
		await expect(async () => {
			const contextResult = await this.callTool("getContext", {});
			tabKey =
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]?.tabs.find(
					(t) => t.url.includes(urlPattern),
				)?.tabKey ?? "";
			expect(tabKey).not.toBe("");
		}).toPass({
			timeout,
			intervals: [
				500,
			],
		});
		return tabKey;
	}

	async waitForTabUriByUrl(
		page: Page,
		urlPattern: string,
		timeout = 10000,
	): Promise<string> {
		const { expect } = await import("@playwright/test");
		await page.waitForURL(`**/*${urlPattern}*`, {
			timeout,
		});
		await page.waitForLoadState("networkidle");
		let tabUri = "";
		await expect(async () => {
			const resources = await this.listResources();
			const tabUris = resources
				.map((r) => r.uri)
				.filter((u) => u.includes("/t-") && !u.includes("/readable-"));
			for (const uri of tabUris) {
				const { json } = await this.readResource(uri);
				const data = json as
					| {
							tab?: {
								url?: string;
							};
					  }
					| undefined;
				if (data?.tab?.url?.includes(urlPattern)) {
					tabUri = uri;
					return;
				}
			}
			expect(tabUri).not.toBe("");
		}).toPass({
			timeout,
			intervals: [
				500,
			],
		});
		return tabUri;
	}
}
