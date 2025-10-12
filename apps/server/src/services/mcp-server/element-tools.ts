import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import type {
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { over } from "ok-value-error-reason";
import { container } from "../container";
import { createErrorResponse, createTextResponse } from "./tool-helpers";
import { tabKeySchema } from "./tool-schemas";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("elementTools");

/**
 * Registers tools for reading element information
 */
export const registerElementTools = (
	server: McpServer,
	toolsInputPort: ServerToolCallsInputPort,
	toolDescriptionsInputPort: ToolDescriptionsInputPort,
) => {
	// Get Readable Text
	logger.verbose("Registering tool: getReadableText");
	server.tool(
		"getReadableText",
		toolDescriptionsInputPort.getReadableTextInstruction(),
		tabKeySchema,
		async ({ tabKey }) => {
			logger.info("Executing getReadableText", {
				tabKey,
			});
			const overInnerText = await over(() =>
				toolsInputPort.getReadableText(tabKey),
			);

			if (!overInnerText.ok) {
				logger.error("Failed to get inner text", {
					tabKey,
					reason: overInnerText.reason,
				});
				return createErrorResponse(
					"Error getting inner text",
					String(overInnerText.reason),
				);
			}

			const innerText = overInnerText.value;
			logger.verbose("Retrieved innerText", {
				tabKey,
				textLength: innerText?.length,
			});
			return createTextResponse(`InnerText: ${JSON.stringify(innerText)}`);
		},
	);

	// Get Readable Elements
	logger.verbose("Registering tool: getReadableElements");
	server.tool(
		"getReadableElements",
		toolDescriptionsInputPort.getReadableElementsInstruction(),
		tabKeySchema,
		async ({ tabKey }) => {
			logger.info("Executing getReadableElements", {
				tabKey,
			});
			const overElements = await over(() =>
				toolsInputPort.getReadableElements(tabKey),
			);

			if (!overElements.ok) {
				logger.error("Failed to get readable elements", {
					tabKey,
					reason: overElements.reason,
				});
				return createErrorResponse(
					"Error getting readable elements",
					String(overElements.reason),
				);
			}

			const elements = overElements.value;
			logger.verbose("Retrieved readable elements", {
				tabKey,
				elementCount: elements.length,
			});
			return createTextResponse(JSON.stringify(elements));
		},
	);
};
