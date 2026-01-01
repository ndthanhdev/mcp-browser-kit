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
import { registerTool } from "../utils/register-tool";
import {
	createErrorResponse,
	createStructuredResponse,
} from "../utils/tool-helpers";
import {
	readableElementOutputSchema,
	readableTextOutputSchema,
	tabKeySchema,
} from "../utils/tool-schemas";

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

	register(server: McpServer): void {
		this.registerGetReadableText(server);
		this.registerGetReadableElements(server);
	}

	private registerGetReadableText(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableText");
		registerTool(
			server,
			"getReadableText",
			{
				description:
					this.toolDescriptionsInputPort.getReadableTextInstruction(),
				inputSchema: tabKeySchema,
				outputSchema: readableTextOutputSchema,
			},
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
					textLength: innerText.length,
				});
				return createStructuredResponse(
					readableTextOutputSchema,
					{ innerText },
					`InnerText: ${JSON.stringify(innerText)}`,
				);
			},
		);
	}

	private registerGetReadableElements(server: McpServer): void {
		this.logger.verbose("Registering tool: getReadableElements");
		registerTool(
			server,
			"getReadableElements",
			{
				description:
					this.toolDescriptionsInputPort.getReadableElementsInstruction(),
				inputSchema: tabKeySchema,
				outputSchema: readableElementOutputSchema,
			},
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
			return createStructuredResponse(readableElementOutputSchema, {
				elements,
			});
			},
		);
	}
}
