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
	createStructuredResponse,
	createTextResponse,
} from "../utils/tool-helpers";
import {
	browserContextOutputSchema,
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
		this.registerGetBasicBrowserContext(server);
		this.registerCaptureTab(server);
		this.registerInvokeJsFn(server);
		this.registerOpenTab(server);
		this.registerCloseTab(server);
		this.registerGetSelection(server);
	}

	private registerGetBasicBrowserContext(server: McpServer): void {
		this.logger.verbose("Registering tool: getBasicBrowserContext");
		server.registerTool(
			"getBasicBrowserContext",
			{
				description:
					this.toolDescriptionsInputPort.getBasicBrowserContextInstruction(),
				inputSchema: {},
				outputSchema: browserContextOutputSchema,
			},
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
				const tabs = ctx.browsers.flatMap((browser) =>
					browser.browserWindows.flatMap((window) =>
						window.tabs.map((tab) => ({
							tabKey: tab.tabKey,
							windowKey: window.windowKey,
							url: tab.url,
							title: tab.title,
						})),
					),
				);
				this.logger.verbose("Retrieved browser context", {
					tabs,
				});
				return createStructuredResponse(browserContextOutputSchema, {
					tabs,
				});
			},
		);
	}

	private registerCaptureTab(server: McpServer): void {
		this.logger.verbose("Registering tool: captureTab");
		server.registerTool(
			"captureTab",
			{
				description: this.toolDescriptionsInputPort.captureTabInstruction(),
				inputSchema: tabKeySchema,
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

	private registerInvokeJsFn(server: McpServer): void {
		this.logger.verbose("Registering tool: invokeJsFn");
		server.registerTool(
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
				return createStructuredResponse(invokeJsFnOutputSchema, {
					result,
				});
			},
		);
	}

	private registerOpenTab(server: McpServer): void {
		this.logger.verbose("Registering tool: openTab");
		server.registerTool(
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
				return createStructuredResponse(
					openTabOutputSchema,
					{
						tabKey: result.tabKey,
						windowKey: result.windowKey,
					},
					`Tab opened successfully. tabKey: ${result.tabKey}, windowKey: ${result.windowKey}`,
				);
			},
		);
	}

	private registerCloseTab(server: McpServer): void {
		this.logger.verbose("Registering tool: closeTab");
		server.registerTool(
			"closeTab",
			{
				description: this.toolDescriptionsInputPort.closeTabInstruction(),
				inputSchema: tabKeySchema,
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

	private registerGetSelection(server: McpServer): void {
		this.logger.verbose("Registering tool: getSelection");
		server.registerTool(
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
					return createErrorResponse(
						"Error getting selection",
						String(overResult.reason),
					);
				}

				const selection = overResult.value;
				this.logger.verbose("Selection retrieved successfully", {
					tabKey,
					hasSelection: !!selection?.selectedText,
				});
				return createStructuredResponse(selectionOutputSchema, {
					selection: selection?.selectedText ?? null,
				});
			},
		);
	}
}
