import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { ToolCallsInputPort } from "@mcp-browser-kit/core-server/input-ports";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
			const ctx = await toolsInputPort.getBasicBrowserContext();
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
			const screenshot = await toolsInputPort.captureActiveTab();
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
			const innerText = await toolsInputPort.getInnerText(tabId);
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
			const elements = await toolsInputPort.getReadableElements(tabId);
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
			await toolsInputPort.clickOnViewableElement(tabId, x, y);
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
			await toolsInputPort.fillTextToViewableElement(tabId, x, y, value);
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
			await toolsInputPort.hitEnterOnViewableElement(tabId, x, y);
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
			await toolsInputPort.clickOnReadableElement(tabId, index);
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
			await toolsInputPort.fillTextToReadableElement(tabId, index, value);
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
			await toolsInputPort.hitEnterOnReadableElement(tabId, index);
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
			const result = await toolsInputPort.invokeJsFn(tabId, fnBodyCode);
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
