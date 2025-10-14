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
import {
	createErrorResponse,
	createImageResponse,
	createTextResponse,
} from "./tool-helpers";
import { invokeJsFnSchema } from "./tool-schemas";

/**
 * Registers browser context and screenshot tools
 */
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

	/**
	 * Registers all browser-related tools with the MCP server
	 */
	register(server: McpServer): void {
		this.registerGetBasicBrowserContext(server);
		this.registerCaptureActiveTab(server);
		this.registerInvokeJsFn(server);
	}

	/**
	 * Registers the getBasicBrowserContext tool
	 */
	private registerGetBasicBrowserContext(server: McpServer): void {
		this.logger.verbose("Registering tool: getBasicBrowserContext");
		server.tool(
			"getBasicBrowserContext",
			this.toolDescriptionsInputPort.getBasicBrowserContextInstruction(),
			{},
			async () => {
				this.logger.verbose("Executing getBasicBrowserContext");
				const overCtx = await over(this.toolsInputPort.getContext);

				if (!overCtx.ok) {
					this.logger.error("Failed to get basic browser context", {
						reason: overCtx.reason,
					});
					return createErrorResponse(
						"Error getting browser context",
						String(overCtx.reason),
					);
				}

				const ctx = overCtx.value;
				this.logger.verbose("Retrieved browser context", {
					tabs: ctx,
				});
				return createTextResponse(JSON.stringify(ctx));
			},
		);
	}

	/**
	 * Registers the captureActiveTab tool
	 */
	private registerCaptureActiveTab(server: McpServer): void {
		this.logger.verbose("Registering tool: captureActiveTab");
		server.tool(
			"captureActiveTab",
			this.toolDescriptionsInputPort.captureActiveTabInstruction(),
			{},
			async () => {
				this.logger.info("Executing captureActiveTab");
				const overScreenshot = await over(this.toolsInputPort.captureTab);

				if (!overScreenshot.ok) {
					this.logger.error("Failed to capture active tab screenshot", {
						reason: overScreenshot.reason,
					});
					return createErrorResponse(
						"Error capturing screenshot",
						String(overScreenshot.reason),
					);
				}

				const screenshot = overScreenshot.value;
				this.logger.verbose("Screenshot captured", {
					width: screenshot.width,
					height: screenshot.height,
				});
				return createImageResponse(
					screenshot,
					`Screenshot size [${screenshot.width}x${screenshot.height}] - Use these dimensions to calculate exact pixel coordinates for clicking and text entry`,
				);
			},
		);
	}

	/**
	 * Registers the invokeJsFn tool
	 */
	private registerInvokeJsFn(server: McpServer): void {
		this.logger.verbose("Registering tool: invokeJsFn");
		server.tool(
			"invokeJsFn",
			this.toolDescriptionsInputPort.invokeJsFnInstruction(),
			invokeJsFnSchema,
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
					return createErrorResponse(
						"Error invoking JavaScript",
						String(overResult.reason),
					);
				}

				const result = overResult.value;
				this.logger.verbose("JavaScript function executed", {
					tabKey,
					hasResult: result !== undefined,
				});
				return createTextResponse(JSON.stringify(result) ?? "undefined");
			},
		);
	}
}
