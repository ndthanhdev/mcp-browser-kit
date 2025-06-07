import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { ToolCallsInputPort } from "@mcp-browser-kit/core-server/input-ports";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { over } from "ok-value-error-reason";
import { container } from "./container";
const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("mcpServer");

const createServer = async () => {
	logger.info("Initializing MCP Browser Kit Server");
	const toolsInputPort = container.get<ToolCallsInputPort>(ToolCallsInputPort);
	// Create server instance
	logger.verbose("Creating MCP server instance");
	const server = new McpServer({
		name: "MCP Browser Kit",
		version: "1.0.0",
		capabilities: {
			resources: {},
			tools: {},
		},
	});

	const combinationDescription = [""].join("\n");

	logger.verbose("Registering tool: getBasicBrowserContext");
	server.tool(
		"getBasicBrowserContext",
		toolsInputPort.getBasicBrowserContextInstruction(),
		{},
		async () => {
			logger.info("Executing getBasicBrowserContext");
			const overCtx = await over(toolsInputPort.getBasicBrowserContext);

			if (!overCtx.ok) {
				logger.error("Failed to get basic browser context", {
					reason: overCtx.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error getting browser context: ${overCtx.reason}`,
						},
					],
				};
			}

			const ctx = overCtx.value;
			logger.verbose("Retrieved browser context", { tabs: ctx });
			return {
				content: [
					{
						type: "text",
						text: `${JSON.stringify(ctx)}`,
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: captureActiveTab");
	server.tool(
		"captureActiveTab",
		[combinationDescription, toolsInputPort.captureActiveTabInstruction()].join(
			"\n",
		),
		{},
		async () => {
			logger.info("Executing captureActiveTab");
			const overScreenshot = await over(toolsInputPort.captureActiveTab);

			if (!overScreenshot.ok) {
				logger.error("Failed to capture active tab screenshot", {
					reason: overScreenshot.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error capturing screenshot: ${overScreenshot.reason}`,
						},
					],
				};
			}

			// const screenshot = overScreenshot.value;

			const screenshot = overScreenshot.value;
			logger.verbose("Screenshot captured", {
				width: screenshot.width,
				height: screenshot.height,
			});
			return {
				content: [
					{
						type: "text",
						text: `Screenshot size [${screenshot.width}x${screenshot.height}] - Use these dimensions to calculate exact pixel coordinates for clicking and text entry`,
					},
					{
						type: "image",
						mimeType: screenshot.mimeType,
						data: screenshot.data,
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: getInnerText");
	server.tool(
		"getInnerText",
		toolsInputPort.getInnerTextInstruction(),
		{
			tabId: z.string().describe("Tab ID to extract text from"),
		},
		async ({ tabId }) => {
			logger.info("Executing getInnerText", { tabId });
			const overInnerText = await over(() => toolsInputPort.getInnerText(tabId));

			if (!overInnerText.ok) {
				logger.error("Failed to get inner text", {
					tabId,
					reason: overInnerText.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error getting inner text: ${overInnerText.reason}`,
						},
					],
				};
			}

			const innerText = overInnerText.value;
			logger.verbose("Retrieved innerText", {
				tabId,
				textLength: innerText?.length,
			});
			return {
				content: [
					{
						type: "text",
						text: `InnerText: ${JSON.stringify(innerText)}`,
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: getReadableElements");
	server.tool(
		"getReadableElements",
		toolsInputPort.getReadableElementsInstruction(),
		{
			tabId: z.string().describe("Tab ID to extract elements from"),
		},
		async ({ tabId }) => {
			logger.info("Executing getReadableElements", { tabId });
			const overElements = await over(() => toolsInputPort.getReadableElements(tabId));

			if (!overElements.ok) {
				logger.error("Failed to get readable elements", {
					tabId,
					reason: overElements.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error getting readable elements: ${overElements.reason}`,
						},
					],
				};
			}

			const elements = overElements.value;
			logger.verbose("Retrieved readable elements", {
				tabId,
				elementCount: elements.length,
			});
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(elements),
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: clickOnViewableElement");
	server.tool(
		"clickOnViewableElement",
		toolsInputPort.clickOnViewableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID of the active tab"),
			x: z.number().describe("X coordinate (pixels) of the element to click"),
			y: z.number().describe("Y coordinate (pixels) of the element to click"),
		},
		async ({ tabId, x, y }) => {
			logger.info("Executing clickOnViewableElement", { tabId, x, y });
			const overClick = await over(() => toolsInputPort.clickOnViewableElement(tabId, x, y));

			if (!overClick.ok) {
				logger.error("Failed to click on viewable element", {
					tabId,
					x,
					y,
					reason: overClick.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error clicking on element: ${overClick.reason}`,
						},
					],
				};
			}

			logger.verbose("Clicked on viewable element", { tabId, x, y });
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: fillTextToViewableElement");
	server.tool(
		"fillTextToViewableElement",
		toolsInputPort.fillTextToViewableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID of the active tab"),
			x: z.number().describe("X coordinate (pixels) of the input element"),
			y: z.number().describe("Y coordinate (pixels) of the input element"),
			value: z.string().describe("Text to enter into the input field"),
		},
		async ({ tabId, x, y, value }) => {
			logger.info("Executing fillTextToViewableElement", { tabId, x, y });
			const overFill = await over(() => toolsInputPort.fillTextToViewableElement(tabId, x, y, value));

			if (!overFill.ok) {
				logger.error("Failed to fill text to viewable element", {
					tabId,
					x,
					y,
					reason: overFill.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error filling text: ${overFill.reason}`,
						},
					],
				};
			}

			logger.verbose("Filled text to viewable element", {
				tabId,
				x,
				y,
				valueLength: value.length,
			});
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: hitEnterOnViewableElement");
	server.tool(
		"hitEnterOnViewableElement",
		toolsInputPort.hitEnterOnViewableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID of the active tab"),
			x: z.number().describe("X coordinate (pixels) of the input element"),
			y: z.number().describe("Y coordinate (pixels) of the input element"),
		},
		async ({ tabId, x, y }) => {
			logger.info("Executing hitEnterOnViewableElement", { tabId, x, y });
			const overEnter = await over(() => toolsInputPort.hitEnterOnViewableElement(tabId, x, y));

			if (!overEnter.ok) {
				logger.error("Failed to hit enter on viewable element", {
					tabId,
					x,
					y,
					reason: overEnter.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error hitting enter: ${overEnter.reason}`,
						},
					],
				};
			}

			logger.verbose("Hit enter on viewable element", { tabId, x, y });
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: clickOnReadableElement");
	server.tool(
		"clickOnReadableElement",
		toolsInputPort.clickOnReadableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID to target"),
			index: z.number().describe("Element index from getReadableElements"),
		},
		async ({ tabId, index }) => {
			logger.info("Executing clickOnReadableElement", { tabId, index });
			const overClick = await over(() => toolsInputPort.clickOnReadableElement(tabId, index));

			if (!overClick.ok) {
				logger.error("Failed to click on readable element", {
					tabId,
					index,
					reason: overClick.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error clicking on element: ${overClick.reason}`,
						},
					],
				};
			}

			logger.verbose("Clicked on readable element", { tabId, index });
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: fillTextToReadableElement");
	server.tool(
		"fillTextToReadableElement",
		toolsInputPort.fillTextToReadableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID to target"),
			index: z.number().describe("Element index from getReadableElements"),
			value: z.string().describe("Text to enter into the input field"),
		},
		async ({ tabId, index, value }) => {
			logger.info("Executing fillTextToReadableElement", { tabId, index });
			const overFill = await over(() => toolsInputPort.fillTextToReadableElement(tabId, index, value));

			if (!overFill.ok) {
				logger.error("Failed to fill text to readable element", {
					tabId,
					index,
					reason: overFill.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error filling text: ${overFill.reason}`,
						},
					],
				};
			}

			logger.verbose("Filled text to readable element", {
				tabId,
				index,
				valueLength: value.length,
			});
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: hitEnterOnReadableElement");
	server.tool(
		"hitEnterOnReadableElement",
		toolsInputPort.hitEnterOnReadableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID to target"),
			index: z.number().describe("Element index from getReadableElements"),
		},
		async ({ tabId, index }) => {
			logger.info("Executing hitEnterOnReadableElement", { tabId, index });
			const overEnter = await over(() => toolsInputPort.hitEnterOnReadableElement(tabId, index));

			if (!overEnter.ok) {
				logger.error("Failed to hit enter on readable element", {
					tabId,
					index,
					reason: overEnter.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error hitting enter: ${overEnter.reason}`,
						},
					],
				};
			}

			logger.verbose("Hit enter on readable element", { tabId, index });
			return {
				content: [
					{
						type: "text",
						text: "Done",
					},
				],
			};
		},
	);

	logger.verbose("Registering tool: invokeJsFn");
	server.tool(
		"invokeJsFn",
		toolsInputPort.invokeJsFnInstruction(),
		{
			tabId: z.string().describe("Tab ID to run JavaScript in"),
			fnBodyCode: z
				.string()
				.describe("JavaScript function body to execute in page context"),
		},
		async ({ tabId, fnBodyCode }) => {
			logger.info("Executing invokeJsFn", { tabId });
			const overResult = await over(() => toolsInputPort.invokeJsFn(tabId, fnBodyCode));

			if (!overResult.ok) {
				logger.error("Failed to invoke JavaScript function", {
					tabId,
					reason: overResult.reason,
				});
				return {
					content: [
						{
							type: "text",
							text: `Error invoking JavaScript: ${overResult.reason}`,
						},
					],
				};
			}

			const result = overResult.value;
			logger.verbose("JavaScript function executed", {
				tabId,
				hasResult: result !== undefined,
			});
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result) ?? "undefined",
					},
				],
			};
		},
	);

	process.on("unhandledRejection", (reason, promise) => {
		logger.error("Unhandled Rejection at:", promise, "reason:", reason);
	});

	logger.info("All MCP server tools registered successfully");
	return server;
};

export const startMcpServer = async () => {
	try {
		const server = await createServer();
		const transport = new StdioServerTransport();
		await server.connect(transport);
		logger.info("MCP Browser Kit Server running on stdio");
	} catch (error) {
		logger.error("Fatal error in main():", error);
		process.exit(1);
	}
};
