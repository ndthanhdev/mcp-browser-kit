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
import {
	coordinateSchema,
	coordinateTextInputSchema,
	readableElementSchema,
	readableElementTextInputSchema,
} from "./tool-schemas";

/**
 * Registers tools for interacting with page elements (clicking, typing, etc.)
 */
@injectable()
export class InteractionTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ServerToolCallsInputPort)
		private readonly toolsInputPort: ServerToolCallsInputPortInterface,
		@inject(ToolDescriptionsInputPort)
		private readonly toolDescriptionsInputPort: ToolDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("interactionTools");
	}

	/**
	 * Registers all interaction-related tools with the MCP server
	 */
	register(server: McpServer): void {
		// Coordinate-based interactions
		this.registerClickOnViewableElement(server);
		this.registerFillTextToViewableElement(server);
		this.registerHitEnterOnViewableElement(server);

		// Readable element path-based interactions
		this.registerClickOnReadableElement(server);
		this.registerFillTextToReadableElement(server);
		this.registerHitEnterOnReadableElement(server);
	}

	// ========== Coordinate-based interactions ==========

	/**
	 * Registers the clickOnViewableElement tool
	 */
	private registerClickOnViewableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: clickOnViewableElement");
		server.registerTool(
			"clickOnViewableElement",
			{
				description:
					this.toolDescriptionsInputPort.clickOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
			},
			async ({ tabKey, x, y }) => {
				this.logger.info("Executing clickOnViewableElement", {
					tabKey,
					x,
					y,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnCoordinates(tabKey, x, y),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on viewable element", {
						tabKey,
						x,
						y,
						reason: overClick.reason,
					});
					return createErrorResponse(
						"Error clicking on element",
						String(overClick.reason),
					);
				}

				this.logger.verbose("Clicked on viewable element", {
					tabKey,
					x,
					y,
				});
				return createTextResponse("Done");
			},
		);
	}

	/**
	 * Registers the fillTextToViewableElement tool
	 */
	private registerFillTextToViewableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: fillTextToViewableElement");
		server.registerTool(
			"fillTextToViewableElement",
			{
				description:
					this.toolDescriptionsInputPort.fillTextToViewableElementInstruction(),
				inputSchema: coordinateTextInputSchema,
			},
			async ({ tabKey, x, y, value }) => {
				this.logger.info("Executing fillTextToViewableElement", {
					tabKey,
					x,
					y,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToCoordinates(tabKey, x, y, value),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to viewable element", {
						tabKey,
						x,
						y,
						reason: overFill.reason,
					});
					return createErrorResponse(
						"Error filling text",
						String(overFill.reason),
					);
				}

				this.logger.verbose("Filled text to viewable element", {
					tabKey,
					x,
					y,
					valueLength: value.length,
				});
				return createTextResponse("Done");
			},
		);
	}

	/**
	 * Registers the hitEnterOnViewableElement tool
	 */
	private registerHitEnterOnViewableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: hitEnterOnViewableElement");
		server.registerTool(
			"hitEnterOnViewableElement",
			{
				description:
					this.toolDescriptionsInputPort.hitEnterOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
			},
			async ({ tabKey, x, y }) => {
				this.logger.info("Executing hitEnterOnViewableElement", {
					tabKey,
					x,
					y,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnCoordinates(tabKey, x, y),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on viewable element", {
						tabKey,
						x,
						y,
						reason: overEnter.reason,
					});
					return createErrorResponse(
						"Error hitting enter",
						String(overEnter.reason),
					);
				}

				this.logger.verbose("Hit enter on viewable element", {
					tabKey,
					x,
					y,
				});
				return createTextResponse("Done");
			},
		);
	}

	// ========== Readable element path-based interactions ==========

	/**
	 * Registers the clickOnReadableElement tool
	 */
	private registerClickOnReadableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: clickOnReadableElement");
		server.registerTool(
			"clickOnReadableElement",
			{
				description:
					this.toolDescriptionsInputPort.clickOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
			},
			async ({ tabKey, readablePath }) => {
				this.logger.info("Executing clickOnReadableElement", {
					tabKey,
					readablePath,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnElement(tabKey, readablePath),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on readable element", {
						tabKey,
						readablePath,
						reason: overClick.reason,
					});
					return createErrorResponse(
						"Error clicking on element",
						String(overClick.reason),
					);
				}

				this.logger.verbose("Clicked on readable element", {
					tabKey,
					readablePath,
				});
				return createTextResponse("Done");
			},
		);
	}

	/**
	 * Registers the fillTextToReadableElement tool
	 */
	private registerFillTextToReadableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: fillTextToReadableElement");
		server.registerTool(
			"fillTextToReadableElement",
			{
				description:
					this.toolDescriptionsInputPort.fillTextToReadableElementInstruction(),
				inputSchema: readableElementTextInputSchema,
			},
			async ({ tabKey, readablePath, value }) => {
				this.logger.info("Executing fillTextToReadableElement", {
					tabKey,
					readablePath,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToElement(tabKey, readablePath, value),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to readable element", {
						tabKey,
						readablePath,
						reason: overFill.reason,
					});
					return createErrorResponse(
						"Error filling text",
						String(overFill.reason),
					);
				}

				this.logger.verbose("Filled text to readable element", {
					tabKey,
					readablePath,
					valueLength: value.length,
				});
				return createTextResponse("Done");
			},
		);
	}

	/**
	 * Registers the hitEnterOnReadableElement tool
	 */
	private registerHitEnterOnReadableElement(server: McpServer): void {
		this.logger.verbose("Registering tool: hitEnterOnReadableElement");
		server.registerTool(
			"hitEnterOnReadableElement",
			{
				description:
					this.toolDescriptionsInputPort.hitEnterOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
			},
			async ({ tabKey, readablePath }) => {
				this.logger.info("Executing hitEnterOnReadableElement", {
					tabKey,
					readablePath,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnElement(tabKey, readablePath),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on readable element", {
						tabKey,
						readablePath,
						reason: overEnter.reason,
					});
					return createErrorResponse(
						"Error hitting enter",
						String(overEnter.reason),
					);
				}

				this.logger.verbose("Hit enter on readable element", {
					tabKey,
					readablePath,
				});
				return createTextResponse("Done");
			},
		);
	}
}
