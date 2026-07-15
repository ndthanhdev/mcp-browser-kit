import {
	LifecycleParticipantOutputPort,
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { BrowserResources } from "./browser-resources";
import { BrowserTools } from "./browser-tools";
import { CliConfig } from "./cli-config";
import { HumanHintTools } from "./human-hint-tools";
import { InteractionTools } from "./interaction-tools";
import { McpHttpTransport } from "./mcp-http-transport";
import { McpServerFactory } from "./mcp-server-factory";
import { ResourceFallbackTools } from "./resource-fallback-tools";

@injectable()
export class ServerDrivingMcpServer implements LifecycleParticipantOutputPort {
	readonly name = "ServerDrivingMcpServer";
	private readonly logger;
	private server: McpServer | null = null;
	private transport: StdioServerTransport | null = null;
	private unsubscribeResources: (() => void) | null = null;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(McpServerFactory)
		private readonly mcpServerFactory: McpServerFactory,
		@inject(McpHttpTransport)
		private readonly httpTransport: McpHttpTransport,
		@inject(CliConfig)
		private readonly cliConfig: CliConfig,
	) {
		this.logger = loggerFactory.create("mcpServer");
	}

	getServer(): McpServer | null {
		return this.server;
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

			const { server, unsubscribeResources } = this.mcpServerFactory.create();
			this.server = server;
			this.unsubscribeResources = unsubscribeResources;

			this.logger.info(
				"All MCP server tools and resources registered successfully",
			);
			return server;
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
			this.transport = serverTransport;

			if (!transport) {
				this.logger.verbose("Creating STDIO transport");
			}

			this.logger.verbose("Connecting MCP server to STDIO transport");
			await this.server.connect(serverTransport);
			this.logger.info("MCP Browser Kit Server running on stdio");
		} catch (error) {
			this.logger.error("Fatal error in listen():", error);
			throw error;
		}
	}

	/** Lifecycle: initialize and begin listening on the configured transport. */
	async start(): Promise<void> {
		this.setupEventHandlers();

		if (this.cliConfig.getTransportMode() === "http") {
			await this.httpTransport.start(
				this.cliConfig.getHttpHost(),
				this.cliConfig.getHttpPort(),
			);
			return;
		}

		await this.initMcpServer();
		await this.listenOnStdio();
	}

	/** Lifecycle: close the MCP server(s) and transport(s). */
	async stop(): Promise<void> {
		await this.httpTransport.stop();

		if (this.unsubscribeResources) {
			try {
				this.logger.verbose("Unsubscribing browser resources");
				this.unsubscribeResources();
			} catch (err) {
				this.logger.error("Error unsubscribing browser resources", err);
			}
			this.unsubscribeResources = null;
		}
		try {
			if (this.server) {
				this.logger.verbose("Closing MCP server");
				await this.server.close();
			}
		} catch (err) {
			this.logger.error("Error closing MCP server", err);
		}
		try {
			if (this.transport) {
				this.logger.verbose("Closing STDIO transport");
				await this.transport.close();
			}
		} catch (err) {
			this.logger.error("Error closing STDIO transport", err);
		}
		this.server = null;
		this.transport = null;
	}

	static setupContainer(container: Container): void {
		container.bind<BrowserTools>(BrowserTools).toSelf();
		container.bind<InteractionTools>(InteractionTools).toSelf();
		container.bind<HumanHintTools>(HumanHintTools).toSelf();
		container.bind<BrowserResources>(BrowserResources).toSelf();
		container.bind<ResourceFallbackTools>(ResourceFallbackTools).toSelf();
		container.bind<CliConfig>(CliConfig).toSelf();
		container.bind<McpServerFactory>(McpServerFactory).toSelf();
		container.bind<McpHttpTransport>(McpHttpTransport).toSelf();

		container.bind<ServerDrivingMcpServer>(ServerDrivingMcpServer).toSelf();

		container
			.bind<LifecycleParticipantOutputPort>(LifecycleParticipantOutputPort)
			.toService(ServerDrivingMcpServer);
	}
}
