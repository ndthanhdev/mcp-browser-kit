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
import { createImageResponse, createOverResponse } from "../utils/tool-helpers";
import {
	actionOutputSchema,
	captureTabOutputSchema,
	contextOutputSchema,
	invokeJsFnOutputSchema,
	invokeJsFnSchema,
	openTabOutputSchema,
	openTabSchema,
	selectionOutputSchema,
	tabKeySchema,
} from "../utils/tool-schemas";

@injectable()
export class BrowserTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ServerToolCallsInputPort)
		private readonly toolsInputPort: ServerToolCallsInputPortInterface,
		@inject(ToolDescriptionsInputPort)
		private readonly toolDescriptionsInputPort: ToolDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("browserTools");
	}

	register(server: McpServer): void {
		this.registerGetContext(server);
		this.registerCaptureTab(server);
		this.registerInvokeJsFn(server);
		this.registerOpenTab(server);
		this.registerCloseTab(server);
		this.registerGetSelection(server);
	}

	private registerGetContext(server: McpServer): void {
		this.logger.verbose("Registering tool: getContext");
		registerTool(
			server,
			"getContext",
			{
				description:
					this.toolDescriptionsInputPort.getBasicBrowserContextInstruction(),
				inputSchema: {},
				outputSchema: contextOutputSchema,
			},
			async () => {
				this.logger.verbose("Executing getContext");
				const overCtx = await over(this.toolsInputPort.getContext);

				if (!overCtx.ok) {
					this.logger.error("Failed to get context", {
						reason: overCtx.reason,
					});
					return createOverResponse(contextOutputSchema, {
						ok: false,
						reason: String(overCtx.reason),
					});
				}

				const ctx = overCtx.value;
				this.logger.verbose("Retrieved browser context", {
					browserCount: ctx.browsers.length,
				});
				return createOverResponse(contextOutputSchema, {
					ok: true,
					value: ctx,
				});
			},
		);
	}

	private registerCaptureTab(server: McpServer): void {
		this.logger.verbose("Registering tool: captureTab");
		registerTool(
			server,
			"captureTab",
			{
				description: this.toolDescriptionsInputPort.captureTabInstruction(),
				inputSchema: tabKeySchema,
				outputSchema: captureTabOutputSchema,
			},
			async ({ tabKey }) => {
				this.logger.info("Executing captureTab", {
					tabKey,
				});
				const overScreenshot = await over(() =>
					this.toolsInputPort.captureTab(tabKey),
				);

				if (!overScreenshot.ok) {
					this.logger.error("Failed to capture tab screenshot", {
						tabKey,
						reason: overScreenshot.reason,
					});
					return createOverResponse(captureTabOutputSchema, {
						ok: false,
						reason: String(overScreenshot.reason),
					});
				}

				const screenshot = overScreenshot.value;
				this.logger.verbose("Screenshot captured", {
					tabKey,
					width: screenshot.width,
					height: screenshot.height,
				});
				const imageResponse = createImageResponse(
					screenshot,
					`Screenshot size [${screenshot.width}x${screenshot.height}] - Use these dimensions to calculate exact pixel coordinates for clicking and text entry`,
				);
				return {
					...imageResponse,
					structuredContent: {
						ok: true,
						value: {
							width: screenshot.width,
							height: screenshot.height,
							mimeType: screenshot.mimeType,
						},
						reason: undefined,
					},
				};
			},
		);
	}

	private registerInvokeJsFn(server: McpServer): void {
		this.logger.verbose("Registering tool: invokeJsFn");
		registerTool(
			server,
			"invokeJsFn",
			{
				description: this.toolDescriptionsInputPort.invokeJsFnInstruction(),
				inputSchema: invokeJsFnSchema,
				outputSchema: invokeJsFnOutputSchema,
			},
			async ({ tabKey, fnBodyCode }) => {
				this.logger.info("Executing invokeJsFn", {
					tabKey,
				});
				const overResult = await over(() =>
					this.toolsInputPort.invokeJsFn(tabKey, fnBodyCode),
				);

				if (!overResult.ok) {
					this.logger.error("Failed to invoke JavaScript function", {
						tabKey,
						reason: overResult.reason,
					});
					return createOverResponse(invokeJsFnOutputSchema, {
						ok: false,
						reason: String(overResult.reason),
					});
				}

				const result = overResult.value;
				this.logger.verbose("JavaScript function executed", {
					tabKey,
					hasResult: result !== undefined,
				});
				return createOverResponse(invokeJsFnOutputSchema, {
					ok: true,
					value: {
						result,
					},
				});
			},
		);
	}

	private registerOpenTab(server: McpServer): void {
		this.logger.verbose("Registering tool: openTab");
		registerTool(
			server,
			"openTab",
			{
				description: this.toolDescriptionsInputPort.openTabInstruction(),
				inputSchema: openTabSchema,
				outputSchema: openTabOutputSchema,
			},
			async ({ windowKey, url }) => {
				this.logger.info("Executing openTab", {
					windowKey,
					url,
				});
				const overResult = await over(() =>
					this.toolsInputPort.openTab(windowKey, url),
				);

				if (!overResult.ok) {
					this.logger.error("Failed to open tab", {
						windowKey,
						url,
						reason: overResult.reason,
					});
					return createOverResponse(openTabOutputSchema, {
						ok: false,
						reason: String(overResult.reason),
					});
				}

				const result = overResult.value;
				this.logger.verbose("Tab opened successfully", {
					tabKey: result.tabKey,
					windowKey: result.windowKey,
				});
				return createOverResponse(
					openTabOutputSchema,
					{
						ok: true,
						value: {
							tabKey: result.tabKey,
							windowKey: result.windowKey,
						},
					},
					`Tab opened successfully. tabKey: ${result.tabKey}, windowKey: ${result.windowKey}`,
				);
			},
		);
	}

	private registerCloseTab(server: McpServer): void {
		this.logger.verbose("Registering tool: closeTab");
		registerTool(
			server,
			"closeTab",
			{
				description: this.toolDescriptionsInputPort.closeTabInstruction(),
				inputSchema: tabKeySchema,
				outputSchema: actionOutputSchema,
			},
			async ({ tabKey }) => {
				this.logger.info("Executing closeTab", {
					tabKey,
				});
				const overResult = await over(() =>
					this.toolsInputPort.closeTab(tabKey),
				);

				if (!overResult.ok) {
					this.logger.error("Failed to close tab", {
						tabKey,
						reason: overResult.reason,
					});
					return createOverResponse(actionOutputSchema, {
						ok: false,
						reason: String(overResult.reason),
					});
				}

				this.logger.verbose("Tab closed successfully", {
					tabKey,
				});
				return createOverResponse(
					actionOutputSchema,
					{
						ok: true,
						value: {},
					},
					"Tab closed successfully",
				);
			},
		);
	}

	private registerGetSelection(server: McpServer): void {
		this.logger.verbose("Registering tool: getSelection");
		registerTool(
			server,
			"getSelection",
			{
				description: this.toolDescriptionsInputPort.getSelectionInstruction(),
				inputSchema: tabKeySchema,
				outputSchema: selectionOutputSchema,
			},
			async ({ tabKey }) => {
				this.logger.info("Executing getSelection", {
					tabKey,
				});
				const overResult = await over(() =>
					this.toolsInputPort.getSelection(tabKey),
				);

				if (!overResult.ok) {
					this.logger.error("Failed to get selection", {
						tabKey,
						reason: overResult.reason,
					});
					return createOverResponse(selectionOutputSchema, {
						ok: false,
						reason: String(overResult.reason),
					});
				}

				const selection = overResult.value;
				this.logger.verbose("Selection retrieved successfully", {
					tabKey,
					hasSelection: !!selection.selectedText,
				});
				return createOverResponse(selectionOutputSchema, {
					ok: true,
					value: selection,
				});
			},
		);
	}
}
