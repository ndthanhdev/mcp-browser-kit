import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { BrowserTools } from "./browser-tools";
import { ElementTools } from "./element-tools";
import { InteractionTools } from "./interaction-tools";

@injectable()
export class ServerDrivingMcpServer {
	private logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(BrowserTools)
		private readonly browserTools: BrowserTools,
		@inject(ElementTools)
		private readonly elementTools: ElementTools,
		@inject(InteractionTools)
		private readonly interactionTools: InteractionTools,
	) {
		this.logger = this.loggerFactory.create("mcpServer");
	}

	private initializeServer(): McpServer {
		this.logger.verbose("Creating MCP server instance");
		return new McpServer({
			name: "MCP Browser Kit",
			version: "1.0.0",
		});
	}

	private setupEventHandlers(): void {
		process.on("unhandledRejection", (reason, promise) => {
			this.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
		});
	}

	private async createServer(): Promise<McpServer> {
		try {
			this.logger.info("Initializing MCP Browser Kit Server");

			const server = this.initializeServer();

			this.logger.verbose("Registering browser tools");
			this.browserTools.register(server);

			this.logger.verbose("Registering element tools");
			this.elementTools.register(server);

			this.logger.verbose("Registering interaction tools");
			this.interactionTools.register(server);

			this.setupEventHandlers();

			this.logger.info("All MCP server tools registered successfully");
			return server;
		} catch (error) {
			this.logger.error("Failed to create MCP server", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	async start(): Promise<void> {
		try {
			this.logger.verbose("Creating MCP server instance");
			const server = await this.createServer();
			this.logger.verbose("Creating STDIO transport");
			const transport = new StdioServerTransport();
			this.logger.verbose("Connecting MCP server to STDIO transport");
			await server.connect(transport);
			this.logger.info("MCP Browser Kit Server running on stdio");
		} catch (error) {
			this.logger.error("Fatal error in start():", error);
			process.exit(1);
		}
	}

	static setupContainer(container: Container): void {
		container.bind<BrowserTools>(BrowserTools).toSelf();
		container.bind<ElementTools>(ElementTools).toSelf();
		container.bind<InteractionTools>(InteractionTools).toSelf();

		container.bind<ServerDrivingMcpServer>(ServerDrivingMcpServer).toSelf();
	}
}
