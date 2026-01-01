import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
	ListToolsResultSchema,
	CallToolResultSchema,
	ListResourcesResultSchema,
	type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type {
	ServerToolName,
	ServerToolArgs,
	ServerToolResult,
} from "@mcp-browser-kit/core-server";

export type TypedCallToolResult<T extends ServerToolName> = Omit<
	CallToolResult,
	"structuredContent"
> & {
	structuredContent?: ServerToolResult<T>;
};
import {
	createCoreServerContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenLoggerFactoryConsolaError } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { ServerDrivingMcpServer } from "@mcp-browser-kit/server-driving-mcp-server";

export class McpClientPageObject {
	private client: Client;
	private clientTransport:
		| ReturnType<typeof InMemoryTransport.createLinkedPair>[0]
		| null = null;
	private serverTransport:
		| ReturnType<typeof InMemoryTransport.createLinkedPair>[1]
		| null = null;
	private mcpServer: ServerDrivingMcpServer | null = null;

	constructor() {
		this.client = new Client({
			name: "e2e-test-client",
			version: "1.0.0",
		});
	}

	async startServer() {
		const container = createCoreServerContainer();

		DrivenLoggerFactoryConsolaError.setupContainer(
			container,
			LoggerFactoryOutputPort,
		);
		ServerDrivenTrpcChannelProvider.setupContainer(container);
		ServerDrivingMcpServer.setupContainer(container);

		const trpcServer = container.get<ServerDrivenTrpcChannelProvider>(
			ServerDrivenTrpcChannelProvider,
		);
		await trpcServer.start();

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

	async callTool<T extends ServerToolName>(
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

	async waitForBrowsers(timeout = 20000) {
		const { expect } = await import("@playwright/test");
		await expect(async () => {
			const contextOutput = await this.callTool("getContext", {});
			expect(contextOutput.structuredContent?.browsers?.length).toBeGreaterThan(0);
		}).toPass({ timeout, intervals: [2000] });
	}
}
