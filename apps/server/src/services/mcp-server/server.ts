import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import {
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "@mcp-browser-kit/core-server/input-ports";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { container } from "../container";
import { registerBrowserTools } from "./browser-tools";
import { registerElementTools } from "./element-tools";
import { registerInteractionTools } from "./interaction-tools";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("mcpServer");

/**
 * Initializes the MCP server instance
 */
const initializeServer = () => {
	logger.verbose("Creating MCP server instance");
	return new McpServer({
		name: "MCP Browser Kit",
		version: "1.0.0",
		capabilities: {
			resources: {},
			tools: {},
		},
	});
};

/**
 * Sets up global event handlers for the process
 */
const setupEventHandlers = () => {
	process.on("unhandledRejection", (reason, promise) => {
		logger.error("Unhandled Rejection at:", promise, "reason:", reason);
	});
};

/**
 * Creates and configures the MCP server with all tools registered
 */
const createServer = async () => {
	try {
		logger.info("Initializing MCP Browser Kit Server");

		// Get dependencies from container
		logger.verbose("Getting tools input port");
		const toolsInputPort = container.get<ServerToolCallsInputPort>(
			ServerToolCallsInputPort,
		);

		logger.verbose("Getting tool descriptions input port");
		const toolDescriptionsInputPort = container.get<ToolDescriptionsInputPort>(
			ToolDescriptionsInputPort,
		);

		// Initialize server
		const server = initializeServer();

		// Register all tools by category
		logger.verbose("Registering browser tools");
		registerBrowserTools(server, toolsInputPort, toolDescriptionsInputPort);

		logger.verbose("Registering element tools");
		registerElementTools(server, toolsInputPort, toolDescriptionsInputPort);

		logger.verbose("Registering interaction tools");
		registerInteractionTools(server, toolsInputPort, toolDescriptionsInputPort);

		// Setup event handlers
		setupEventHandlers();

		logger.info("All MCP server tools registered successfully");
		return server;
	} catch (error) {
		logger.error("Failed to create MCP server", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
};

export const startMcpServer = async () => {
	try {
		logger.verbose("Creating MCP server instance");
		const server = await createServer();
		logger.verbose("Creating STDIO transport");
		const transport = new StdioServerTransport();
		logger.verbose("Connecting MCP server to STDIO transport");
		await server.connect(transport);
		logger.info("MCP Browser Kit Server running on stdio");
	} catch (error) {
		logger.error("Fatal error in main():", error);
		process.exit(1);
	}
};
