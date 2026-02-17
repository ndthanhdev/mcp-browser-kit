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
import { createOverResponse } from "../utils/tool-helpers";
import {
	actionOutputSchema,
	coordinateSchema,
	coordinateTextInputSchema,
	readableElementSchema,
	readableElementTextInputSchema,
} from "../utils/tool-schemas";

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

	register(server: McpServer): void {
		this.registerClickOnCoordinates(server);
		this.registerFillTextToCoordinates(server);
		this.registerHitEnterOnCoordinates(server);

		this.registerClickOnElement(server);
		this.registerFillTextToElement(server);
		this.registerHitEnterOnElement(server);
	}

	private registerClickOnCoordinates(server: McpServer): void {
		this.logger.verbose("Registering tool: clickOnCoordinates");
		registerTool(
			server,
			"clickOnCoordinates",
			{
				description:
					this.toolDescriptionsInputPort.clickOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, x, y }) => {
				this.logger.info("Executing clickOnCoordinates", {
					tabKey,
					x,
					y,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnCoordinates(tabKey, x, y),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on coordinates", {
						tabKey,
						x,
						y,
						reason: overClick.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overClick.reason),
					});
				}

				this.logger.verbose("Clicked on coordinates", {
					tabKey,
					x,
					y,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}

	private registerFillTextToCoordinates(server: McpServer): void {
		this.logger.verbose("Registering tool: fillTextToCoordinates");
		registerTool(
			server,
			"fillTextToCoordinates",
			{
				description:
					this.toolDescriptionsInputPort.fillTextToViewableElementInstruction(),
				inputSchema: coordinateTextInputSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, x, y, value }) => {
				this.logger.info("Executing fillTextToCoordinates", {
					tabKey,
					x,
					y,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToCoordinates(tabKey, x, y, value),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to coordinates", {
						tabKey,
						x,
						y,
						reason: overFill.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overFill.reason),
					});
				}

				this.logger.verbose("Filled text to coordinates", {
					tabKey,
					x,
					y,
					valueLength: value.length,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}

	private registerHitEnterOnCoordinates(server: McpServer): void {
		this.logger.verbose("Registering tool: hitEnterOnCoordinates");
		registerTool(
			server,
			"hitEnterOnCoordinates",
			{
				description:
					this.toolDescriptionsInputPort.hitEnterOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, x, y }) => {
				this.logger.info("Executing hitEnterOnCoordinates", {
					tabKey,
					x,
					y,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnCoordinates(tabKey, x, y),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on coordinates", {
						tabKey,
						x,
						y,
						reason: overEnter.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overEnter.reason),
					});
				}

				this.logger.verbose("Hit enter on coordinates", {
					tabKey,
					x,
					y,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}

	private registerClickOnElement(server: McpServer): void {
		this.logger.verbose("Registering tool: clickOnElement");
		registerTool(
			server,
			"clickOnElement",
			{
				description:
					this.toolDescriptionsInputPort.clickOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, readablePath }) => {
				this.logger.info("Executing clickOnElement", {
					tabKey,
					readablePath,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnElement(tabKey, readablePath),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on element", {
						tabKey,
						readablePath,
						reason: overClick.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overClick.reason),
					});
				}

				this.logger.verbose("Clicked on element", {
					tabKey,
					readablePath,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}

	private registerFillTextToElement(server: McpServer): void {
		this.logger.verbose("Registering tool: fillTextToElement");
		registerTool(
			server,
			"fillTextToElement",
			{
				description:
					this.toolDescriptionsInputPort.fillTextToReadableElementInstruction(),
				inputSchema: readableElementTextInputSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, readablePath, value }) => {
				this.logger.info("Executing fillTextToElement", {
					tabKey,
					readablePath,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToElement(tabKey, readablePath, value),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to element", {
						tabKey,
						readablePath,
						reason: overFill.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overFill.reason),
					});
				}

				this.logger.verbose("Filled text to element", {
					tabKey,
					readablePath,
					valueLength: value.length,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}

	private registerHitEnterOnElement(server: McpServer): void {
		this.logger.verbose("Registering tool: hitEnterOnElement");
		registerTool(
			server,
			"hitEnterOnElement",
			{
				description:
					this.toolDescriptionsInputPort.hitEnterOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey, readablePath }) => {
				this.logger.info("Executing hitEnterOnElement", {
					tabKey,
					readablePath,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnElement(tabKey, readablePath),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on element", {
						tabKey,
						readablePath,
						reason: overEnter.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overEnter.reason),
					});
				}

				this.logger.verbose("Hit enter on element", {
					tabKey,
					readablePath,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Done",
				);
			},
		);
	}
}
