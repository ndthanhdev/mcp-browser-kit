import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import {
	ServerToolCallsInputPort,
	type ServerToolCallsInputPort as ServerToolCallsInputPortInterface,
	ToolDescriptionsInputPort,
	type ToolDescriptionsInputPort as ToolDescriptionsInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inject, injectable } from "inversify";
import { over } from "ok-value-error-reason";
import { createErrorResponse, createTextResponse } from "./tool-helpers";
import { tabKeySchema } from "./tool-schemas";

/**
 * Registers tools for reading element information
 */
@injectable()
export class ElementTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ServerToolCallsInputPort)
		private readonly toolsInputPort: ServerToolCallsInputPortInterface,
		@inject(ToolDescriptionsInputPort)
		private readonly toolDescriptionsInputPort: ToolDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("elementTools");
	}

	/**
	 * Registers all element-related tools with the MCP server
	 */
	register(server: McpServer): void {
		this.registerGetReadableText(server);
		this.registerGetReadableElements(server);
	}

	/**
	 * Registers the getReadableText tool
	 */
	private registerGetReadableText(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableText");
		server.tool(
			"getReadableText",
			this.toolDescriptionsInputPort.getReadableTextInstruction(),
			tabKeySchema,
			async ({ tabKey }) => {
				this.logger.info("Executing getReadableText", {
					tabKey,
				});
				const overInnerText = await over(() =>
					this.toolsInputPort.getReadableText(tabKey),
				);

				if (!overInnerText.ok) {
					this.logger.error("Failed to get inner text", {
						tabKey,
						reason: overInnerText.reason,
					});
					return createErrorResponse(
						"Error getting inner text",
						String(overInnerText.reason),
					);
				}

				const innerText = overInnerText.value;
				this.logger.verbose("Retrieved innerText", {
					tabKey,
					textLength: innerText?.length,
				});
				return createTextResponse(`InnerText: ${JSON.stringify(innerText)}`);
			},
		);
	}

	/**
	 * Registers the getReadableElements tool
	 */
	private registerGetReadableElements(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableElements");
		server.tool(
			"getReadableElements",
			this.toolDescriptionsInputPort.getReadableElementsInstruction(),
			tabKeySchema,
			async ({ tabKey }) => {
				this.logger.info("Executing getReadableElements", {
					tabKey,
				});
				const overElements = await over(() =>
					this.toolsInputPort.getReadableElements(tabKey),
				);

				if (!overElements.ok) {
					this.logger.error("Failed to get readable elements", {
						tabKey,
						reason: overElements.reason,
					});
					return createErrorResponse(
						"Error getting readable elements",
						String(overElements.reason),
					);
				}

				const elements = overElements.value;
				this.logger.verbose("Retrieved readable elements", {
					tabKey,
					elementCount: elements.length,
				});
				return createTextResponse(JSON.stringify(elements));
			},
		);
	}
}
