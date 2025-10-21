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
import { invokeJsFnSchema, openTabSchema, tabKeySchema } from "./tool-schemas";

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
		this.registerCaptureTab(server);
		this.registerInvokeJsFn(server);
		this.registerOpenTab(server);
		this.registerCloseTab(server);
		this.registerGetSelection(server);
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
	 * Registers the captureTab tool
	 */
	private registerCaptureTab(server: McpServer): void {
		this.logger.verbose("Registering tool: captureTab");
		server.tool(
			"captureTab",
			this.toolDescriptionsInputPort.captureTabInstruction(),
			tabKeySchema,
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
					return createErrorResponse(
						"Error capturing screenshot",
						String(overScreenshot.reason),
					);
				}

				const screenshot = overScreenshot.value;
				this.logger.verbose("Screenshot captured", {
					tabKey,
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

	/**
	 * Registers the openTab tool
	 */
	private registerOpenTab(server: McpServer): void {
		this.logger.verbose("Registering tool: openTab");
		server.tool(
			"openTab",
			this.toolDescriptionsInputPort.openTabInstruction(),
			openTabSchema,
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
					return createErrorResponse(
						"Error opening tab",
						String(overResult.reason),
					);
				}

				const result = overResult.value;
				this.logger.verbose("Tab opened successfully", {
					tabKey: result.tabKey,
					windowKey: result.windowKey,
				});
				return createTextResponse(
					`Tab opened successfully. tabKey: ${result.tabKey}, windowKey: ${result.windowKey}`,
				);
			},
		);
	}

	/**
	 * Registers the closeTab tool
	 */
	private registerCloseTab(server: McpServer): void {
		this.logger.verbose("Registering tool: closeTab");
		server.tool(
			"closeTab",
			this.toolDescriptionsInputPort.closeTabInstruction(),
			tabKeySchema,
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
					return createErrorResponse(
						"Error closing tab",
						String(overResult.reason),
					);
				}

				this.logger.verbose("Tab closed successfully", {
					tabKey,
				});
				return createTextResponse("Tab closed successfully");
			},
		);
	}

	/**
	 * Registers the getSelection tool
	 */
	private registerGetSelection(server: McpServer): void {
		this.logger.verbose("Registering tool: getSelection");
		server.tool(
			"getSelection",
			this.toolDescriptionsInputPort.getSelectionInstruction(),
			tabKeySchema,
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
					return createErrorResponse(
						"Error getting selection",
						String(overResult.reason),
					);
				}

				const selection = overResult.value;
				this.logger.verbose("Selection retrieved successfully", {
					tabKey,
					hasSelection: selection !== undefined,
				});
				return createTextResponse(JSON.stringify(selection));
			},
		);
	}
}
