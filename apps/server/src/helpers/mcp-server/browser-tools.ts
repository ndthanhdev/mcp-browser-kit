import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import type {
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { over } from "ok-value-error-reason";
import { container } from "../container";
import {
	createErrorResponse,
	createImageResponse,
	createTextResponse,
} from "./tool-helpers";
import { invokeJsFnSchema } from "./tool-schemas";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("browserTools");

/**
 * Registers browser context and screenshot tools
 */
export const registerBrowserTools = (
	server: McpServer,
	toolsInputPort: ServerToolCallsInputPort,
	toolDescriptionsInputPort: ToolDescriptionsInputPort,
) => {
	// Get Basic Browser Context
	logger.verbose("Registering tool: getBasicBrowserContext");
	server.tool(
		"getBasicBrowserContext",
		toolDescriptionsInputPort.getBasicBrowserContextInstruction(),
		{},
		async () => {
			logger.verbose("Executing getBasicBrowserContext");
			const overCtx = await over(toolsInputPort.getContext);

			if (!overCtx.ok) {
				logger.error("Failed to get basic browser context", {
					reason: overCtx.reason,
				});
				return createErrorResponse(
					"Error getting browser context",
					String(overCtx.reason),
				);
			}

			const ctx = overCtx.value;
			logger.verbose("Retrieved browser context", {
				tabs: ctx,
			});
			return createTextResponse(JSON.stringify(ctx));
		},
	);

	// Capture Active Tab
	logger.verbose("Registering tool: captureActiveTab");
	server.tool(
		"captureActiveTab",
		toolDescriptionsInputPort.captureActiveTabInstruction(),
		{},
		async () => {
			logger.info("Executing captureActiveTab");
			const overScreenshot = await over(toolsInputPort.captureTab);

			if (!overScreenshot.ok) {
				logger.error("Failed to capture active tab screenshot", {
					reason: overScreenshot.reason,
				});
				return createErrorResponse(
					"Error capturing screenshot",
					String(overScreenshot.reason),
				);
			}

			const screenshot = overScreenshot.value;
			logger.verbose("Screenshot captured", {
				width: screenshot.width,
				height: screenshot.height,
			});
			return createImageResponse(
				screenshot,
				`Screenshot size [${screenshot.width}x${screenshot.height}] - Use these dimensions to calculate exact pixel coordinates for clicking and text entry`,
			);
		},
	);

	// Invoke JavaScript Function
	logger.verbose("Registering tool: invokeJsFn");
	server.tool(
		"invokeJsFn",
		toolDescriptionsInputPort.invokeJsFnInstruction(),
		invokeJsFnSchema,
		async ({ tabId, fnBodyCode }) => {
			logger.info("Executing invokeJsFn", {
				tabId,
			});
			const overResult = await over(() =>
				toolsInputPort.invokeJsFn(tabId, fnBodyCode),
			);

			if (!overResult.ok) {
				logger.error("Failed to invoke JavaScript function", {
					tabId,
					reason: overResult.reason,
				});
				return createErrorResponse(
					"Error invoking JavaScript",
					String(overResult.reason),
				);
			}

			const result = overResult.value;
			logger.verbose("JavaScript function executed", {
				tabId,
				hasResult: result !== undefined,
			});
			return createTextResponse(JSON.stringify(result) ?? "undefined");
		},
	);
};
