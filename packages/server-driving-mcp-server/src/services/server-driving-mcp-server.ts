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
	private server: McpServer | null = null;

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

	getServer(): McpServer | null {
		return this.server;
	}

	private createMcpServerInstance(): McpServer {
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

	async initMcpServer(): Promise<McpServer> {
		if (this.server) {
			this.logger.verbose("Returning existing MCP server instance");
			return this.server;
		}

		try {
			this.logger.info("Initializing MCP Browser Kit Server");

			this.server = this.createMcpServerInstance();

			this.logger.verbose("Registering browser tools");
			this.browserTools.register(this.server);

			this.logger.verbose("Registering element tools");
			this.elementTools.register(this.server);

			this.logger.verbose("Registering interaction tools");
			this.interactionTools.register(this.server);

			this.setupEventHandlers();

			this.logger.info("All MCP server tools registered successfully");
			return this.server;
		} catch (error) {
			this.logger.error("Failed to initialize MCP server", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	async listenOnStdio(transport?: StdioServerTransport): Promise<void> {
		try {
			if (!this.server) {
				throw new Error("Server not initialized. Call init() first.");
			}

			const serverTransport = transport ?? new StdioServerTransport();

			if (!transport) {
				this.logger.verbose("Creating STDIO transport");
			}

			this.logger.verbose("Connecting MCP server to STDIO transport");
			await this.server.connect(serverTransport);
			this.logger.info("MCP Browser Kit Server running on stdio");
		} catch (error) {
			this.logger.error("Fatal error in listen():", error);
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
