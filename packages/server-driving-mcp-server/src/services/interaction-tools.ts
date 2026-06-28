import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
	ServerToolCallsInputPort,
	type ServerToolCallsInputPort as ServerToolCallsInputPortInterface,
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
	scrollPageSchema,
} from "../utils/tool-schemas";

@injectable()
export class InteractionTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ServerToolCallsInputPort)
		private readonly toolsInputPort: ServerToolCallsInputPortInterface,
		@inject(McpDescriptionsInputPort)
		private readonly toolDescriptionsInputPort: McpDescriptionsInputPortInterface,
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

		this.registerScrollPage(server);
	}

	private registerScrollPage(server: McpServer): void {
		this.logger.verbose("Registering tool: scrollPage");
		registerTool(
			server,
			"scrollPage",
			{
				title: "Scroll the page",
				description: this.toolDescriptionsInputPort.scrollPageInstruction(),
				inputSchema: scrollPageSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, direction, amount }) => {
				this.logger.info("Executing scrollPage", {
					browserId,
					tabId,
					direction,
					amount,
				});
				const overScroll = await over(() =>
					this.toolsInputPort.scrollPage(
						browserId,
						windowId,
						tabId,
						direction,
						amount,
					),
				);

				if (!overScroll.ok) {
					this.logger.error("Failed to scroll page", {
						browserId,
						tabId,
						direction,
						amount,
						reason: overScroll.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overScroll.reason),
					});
				}

				this.logger.verbose("Scrolled page", {
					browserId,
					tabId,
					direction,
					amount,
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

	private registerClickOnCoordinates(server: McpServer): void {
		this.logger.verbose("Registering tool: clickOnCoordinates");
		registerTool(
			server,
			"clickOnCoordinates",
			{
				title: "Click at coordinates",
				description:
					this.toolDescriptionsInputPort.clickOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, x, y }) => {
				this.logger.info("Executing clickOnCoordinates", {
					browserId,
					tabId,
					x,
					y,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnCoordinates(
						browserId,
						windowId,
						tabId,
						x,
						y,
					),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on coordinates", {
						browserId,
						tabId,
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
					browserId,
					tabId,
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
				title: "Fill text at coordinates",
				description:
					this.toolDescriptionsInputPort.fillTextToViewableElementInstruction(),
				inputSchema: coordinateTextInputSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, x, y, value }) => {
				this.logger.info("Executing fillTextToCoordinates", {
					browserId,
					tabId,
					x,
					y,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToCoordinates(
						browserId,
						windowId,
						tabId,
						x,
						y,
						value,
					),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to coordinates", {
						browserId,
						tabId,
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
					browserId,
					tabId,
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
				title: "Hit enter at coordinates",
				description:
					this.toolDescriptionsInputPort.hitEnterOnViewableElementInstruction(),
				inputSchema: coordinateSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, x, y }) => {
				this.logger.info("Executing hitEnterOnCoordinates", {
					browserId,
					tabId,
					x,
					y,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnCoordinates(
						browserId,
						windowId,
						tabId,
						x,
						y,
					),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on coordinates", {
						browserId,
						tabId,
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
					browserId,
					tabId,
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
				title: "Click element",
				description:
					this.toolDescriptionsInputPort.clickOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, readablePath }) => {
				this.logger.info("Executing clickOnElement", {
					browserId,
					tabId,
					readablePath,
				});
				const overClick = await over(() =>
					this.toolsInputPort.clickOnElement(
						browserId,
						windowId,
						tabId,
						readablePath,
					),
				);

				if (!overClick.ok) {
					this.logger.error("Failed to click on element", {
						browserId,
						tabId,
						readablePath,
						reason: overClick.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overClick.reason),
					});
				}

				this.logger.verbose("Clicked on element", {
					browserId,
					tabId,
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
				title: "Fill text into element",
				description:
					this.toolDescriptionsInputPort.fillTextToReadableElementInstruction(),
				inputSchema: readableElementTextInputSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, readablePath, value }) => {
				this.logger.info("Executing fillTextToElement", {
					browserId,
					tabId,
					readablePath,
				});
				const overFill = await over(() =>
					this.toolsInputPort.fillTextToElement(
						browserId,
						windowId,
						tabId,
						readablePath,
						value,
					),
				);

				if (!overFill.ok) {
					this.logger.error("Failed to fill text to element", {
						browserId,
						tabId,
						readablePath,
						reason: overFill.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overFill.reason),
					});
				}

				this.logger.verbose("Filled text to element", {
					browserId,
					tabId,
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
				title: "Hit enter on element",
				description:
					this.toolDescriptionsInputPort.hitEnterOnReadableElementInstruction(),
				inputSchema: readableElementSchema,
				outputSchema: actionOutputSchema,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ browserId, windowId, tabId, readablePath }) => {
				this.logger.info("Executing hitEnterOnElement", {
					browserId,
					tabId,
					readablePath,
				});
				const overEnter = await over(() =>
					this.toolsInputPort.hitEnterOnElement(
						browserId,
						windowId,
						tabId,
						readablePath,
					),
				);

				if (!overEnter.ok) {
					this.logger.error("Failed to hit enter on element", {
						browserId,
						tabId,
						readablePath,
						reason: overEnter.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overEnter.reason),
					});
				}

				this.logger.verbose("Hit enter on element", {
					browserId,
					tabId,
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
