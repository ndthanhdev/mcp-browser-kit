import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inject, injectable } from "inversify";
import { BrowserResources } from "./browser-resources";
import { BrowserTools } from "./browser-tools";
import { HumanHintTools } from "./human-hint-tools";
import { InteractionTools } from "./interaction-tools";
import { ResourceFallbackTools } from "./resource-fallback-tools";

export interface McpServerInstance {
	server: McpServer;
	unsubscribeResources: () => void;
}

/**
 * Builds fully-tooled `McpServer` instances. Called once for the single
 * stdio-mode server and once per HTTP session's own server.
 */
@injectable()
export class McpServerFactory {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(BrowserTools)
		private readonly browserTools: BrowserTools,
		@inject(InteractionTools)
		private readonly interactionTools: InteractionTools,
		@inject(HumanHintTools)
		private readonly humanHintTools: HumanHintTools,
		@inject(BrowserResources)
		private readonly browserResources: BrowserResources,
		@inject(ResourceFallbackTools)
		private readonly resourceFallbackTools: ResourceFallbackTools,
		@inject(McpDescriptionsInputPort)
		private readonly mcpDescriptions: McpDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("mcpServerFactory");
	}

	create(): McpServerInstance {
		this.logger.verbose("Creating MCP server instance");
		const server = new McpServer(
			{
				name: "MCP Browser Kit",
				version: "1.0.0",
			},
			{
				instructions: this.mcpDescriptions.serverInstructions(),
			},
		);

		const unsubscribeResources = this.registerToolsAndResources(server);
		return {
			server,
			unsubscribeResources,
		};
	}

	private registerToolsAndResources(server: McpServer): () => void {
		this.logger.verbose("Registering browser tools");
		this.browserTools.register(server);

		this.logger.verbose("Registering interaction tools");
		this.interactionTools.register(server);

		this.logger.verbose("Registering human hint tools");
		this.humanHintTools.register(server);

		this.logger.verbose("Registering resource fallback tools");
		this.resourceFallbackTools.register(server);

		this.logger.verbose("Registering browser resources");
		return this.browserResources.register(server);
	}
}
