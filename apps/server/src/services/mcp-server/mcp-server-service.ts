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
export class McpServerService {
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
		this.logger = this.loggerFactory.create("mcpServerService");
	}

	/**
	 * Initializes the MCP server instance
	 */
	private initializeServer(): McpServer {
		this.logger.verbose("Creating MCP server instance");
		return new McpServer({
			name: "MCP Browser Kit",
			version: "1.0.0",
			capabilities: {
				resources: {},
				tools: {},
			},
		});
	}

	/**
	 * Sets up global event handlers for the process
	 */
	private setupEventHandlers(): void {
		process.on("unhandledRejection", (reason, promise) => {
			this.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
		});
	}

	/**
	 * Creates and configures the MCP server with all tools registered
	 */
	private async createServer(): Promise<McpServer> {
		try {
			this.logger.info("Initializing MCP Browser Kit Server");

			// Initialize server
			const server = this.initializeServer();

			// Register all tools by category
			this.logger.verbose("Registering browser tools");
			this.browserTools.register(server);

			this.logger.verbose("Registering element tools");
			this.elementTools.register(server);

			this.logger.verbose("Registering interaction tools");
			this.interactionTools.register(server);

			// Setup event handlers
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

	/**
	 * Starts the MCP server with STDIO transport
	 */
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

	/**
	 * Setup container bindings for McpServerService
	 */
	static setupContainer(container: Container): void {
		// Bind tool classes
		container.bind<BrowserTools>(BrowserTools).toSelf();
		container.bind<ElementTools>(ElementTools).toSelf();
		container.bind<InteractionTools>(InteractionTools).toSelf();

		// Bind McpServerService to itself
		container.bind<McpServerService>(McpServerService).toSelf();
	}
}
