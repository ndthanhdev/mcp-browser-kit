import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import type {
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { over } from "ok-value-error-reason";
import { container } from "../container";
import { createErrorResponse, createTextResponse } from "./tool-helpers";
import {
	coordinateSchema,
	coordinateTextInputSchema,
	readableElementSchema,
	readableElementTextInputSchema,
} from "./tool-schemas";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("interactionTools");

/**
 * Registers tools for interacting with page elements (clicking, typing, etc.)
 */
export const registerInteractionTools = (
	server: McpServer,
	toolsInputPort: ServerToolCallsInputPort,
	toolDescriptionsInputPort: ToolDescriptionsInputPort,
) => {
	// ========== Coordinate-based interactions ==========

	// Click on Viewable Element (by coordinates)
	logger.verbose("Registering tool: clickOnViewableElement");
	server.tool(
		"clickOnViewableElement",
		toolDescriptionsInputPort.clickOnViewableElementInstruction(),
		coordinateSchema,
		async ({ tabId, x, y }) => {
			logger.info("Executing clickOnViewableElement", {
				tabId,
				x,
				y,
			});
			const overClick = await over(() =>
				toolsInputPort.clickOnCoordinates(tabId, x, y),
			);

			if (!overClick.ok) {
				logger.error("Failed to click on viewable element", {
					tabId,
					x,
					y,
					reason: overClick.reason,
				});
				return createErrorResponse(
					"Error clicking on element",
					String(overClick.reason),
				);
			}

			logger.verbose("Clicked on viewable element", {
				tabId,
				x,
				y,
			});
			return createTextResponse("Done");
		},
	);

	// Fill Text to Viewable Element (by coordinates)
	logger.verbose("Registering tool: fillTextToViewableElement");
	server.tool(
		"fillTextToViewableElement",
		toolDescriptionsInputPort.fillTextToViewableElementInstruction(),
		coordinateTextInputSchema,
		async ({ tabId, x, y, value }) => {
			logger.info("Executing fillTextToViewableElement", {
				tabId,
				x,
				y,
			});
			const overFill = await over(() =>
				toolsInputPort.fillTextToCoordinates(tabId, x, y, value),
			);

			if (!overFill.ok) {
				logger.error("Failed to fill text to viewable element", {
					tabId,
					x,
					y,
					reason: overFill.reason,
				});
				return createErrorResponse(
					"Error filling text",
					String(overFill.reason),
				);
			}

			logger.verbose("Filled text to viewable element", {
				tabId,
				x,
				y,
				valueLength: value.length,
			});
			return createTextResponse("Done");
		},
	);

	// Hit Enter on Viewable Element (by coordinates)
	logger.verbose("Registering tool: hitEnterOnViewableElement");
	server.tool(
		"hitEnterOnViewableElement",
		toolDescriptionsInputPort.hitEnterOnViewableElementInstruction(),
		coordinateSchema,
		async ({ tabId, x, y }) => {
			logger.info("Executing hitEnterOnViewableElement", {
				tabId,
				x,
				y,
			});
			const overEnter = await over(() =>
				toolsInputPort.hitEnterOnCoordinates(tabId, x, y),
			);

			if (!overEnter.ok) {
				logger.error("Failed to hit enter on viewable element", {
					tabId,
					x,
					y,
					reason: overEnter.reason,
				});
				return createErrorResponse(
					"Error hitting enter",
					String(overEnter.reason),
				);
			}

			logger.verbose("Hit enter on viewable element", {
				tabId,
				x,
				y,
			});
			return createTextResponse("Done");
		},
	);

	// ========== Readable element path-based interactions ==========

	// Click on Readable Element (by path)
	logger.verbose("Registering tool: clickOnReadableElement");
	server.tool(
		"clickOnReadableElement",
		toolDescriptionsInputPort.clickOnReadableElementInstruction(),
		readableElementSchema,
		async ({ tabId, readablePath }) => {
			logger.info("Executing clickOnReadableElement", {
				tabId,
				readablePath,
			});
			const overClick = await over(() =>
				toolsInputPort.clickOnElement(tabId, readablePath),
			);

			if (!overClick.ok) {
				logger.error("Failed to click on readable element", {
					tabId,
					readablePath,
					reason: overClick.reason,
				});
				return createErrorResponse(
					"Error clicking on element",
					String(overClick.reason),
				);
			}

			logger.verbose("Clicked on readable element", {
				tabId,
				readablePath,
			});
			return createTextResponse("Done");
		},
	);

	// Fill Text to Readable Element (by path)
	logger.verbose("Registering tool: fillTextToReadableElement");
	server.tool(
		"fillTextToReadableElement",
		toolDescriptionsInputPort.fillTextToReadableElementInstruction(),
		readableElementTextInputSchema,
		async ({ tabId, readablePath, value }) => {
			logger.info("Executing fillTextToReadableElement", {
				tabId,
				readablePath,
			});
			const overFill = await over(() =>
				toolsInputPort.fillTextToElement(tabId, readablePath, value),
			);

			if (!overFill.ok) {
				logger.error("Failed to fill text to readable element", {
					tabId,
					readablePath,
					reason: overFill.reason,
				});
				return createErrorResponse(
					"Error filling text",
					String(overFill.reason),
				);
			}

			logger.verbose("Filled text to readable element", {
				tabId,
				readablePath,
				valueLength: value.length,
			});
			return createTextResponse("Done");
		},
	);

	// Hit Enter on Readable Element (by path)
	logger.verbose("Registering tool: hitEnterOnReadableElement");
	server.tool(
		"hitEnterOnReadableElement",
		toolDescriptionsInputPort.hitEnterOnReadableElementInstruction(),
		readableElementSchema,
		async ({ tabId, readablePath }) => {
			logger.info("Executing hitEnterOnReadableElement", {
				tabId,
				readablePath,
			});
			const overEnter = await over(() =>
				toolsInputPort.hitEnterOnElement(tabId, readablePath),
			);

			if (!overEnter.ok) {
				logger.error("Failed to hit enter on readable element", {
					tabId,
					readablePath,
					reason: overEnter.reason,
				});
				return createErrorResponse(
					"Error hitting enter",
					String(overEnter.reason),
				);
			}

			logger.verbose("Hit enter on readable element", {
				tabId,
				readablePath,
			});
			return createTextResponse("Done");
		},
	);
};
