import { ToolsInputPort } from "@mcp-browser-kit/core-server/input-ports";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { container } from "./container";

const createServer = async () => {
	// Dependency instances
	const toolsInputPort = container.get<ToolsInputPort>(ToolsInputPort);
	// Create server instance
	const server = new McpServer({
		name: "MCP Browser Kit",
		version: "1.0.0",
		capabilities: {
			resources: {},
			tools: {},
		},
	});

	const combinationDescription = [""].join("\n");

	server.tool("getTabs", toolsInputPort.getTabsInstruction(), {}, async () => {
		const tabs = await toolsInputPort.getTabs();
		return {
			content: [
				{
					type: "text",
					text: `Tabs: ${JSON.stringify(tabs)}`,
				},
			],
		};
	});

	server.tool(
		"captureActiveTab",
		[combinationDescription, toolsInputPort.captureActiveTabInstruction()].join(
			"\n",
		),
		{},
		async () => {
			const screenshot = await toolsInputPort.captureActiveTab();
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

	server.tool(
		"getInnerText",
		toolsInputPort.getInnerTextInstruction(),
		{
			tabId: z.string().describe("Tab ID to extract text from"),
		},
		async ({ tabId }) => {
			const innerText = await toolsInputPort.getInnerText(tabId);
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

	server.tool(
		"getReadableElements",
		toolsInputPort.getReadableElementsInstruction(),
		{
			tabId: z.string().describe("Tab ID to extract elements from"),
		},
		async ({ tabId }) => {
			const elements = await toolsInputPort.getReadableElements(tabId);
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

	server.tool(
		"clickOnViewableElement",
		toolsInputPort.clickOnViewableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID of the active tab"),
			x: z.number().describe("X coordinate (pixels) of the element to click"),
			y: z.number().describe("Y coordinate (pixels) of the element to click"),
		},
		async ({ tabId, x, y }) => {
			await toolsInputPort.clickOnViewableElement(tabId, x, y);
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
			await toolsInputPort.fillTextToViewableElement(tabId, x, y, value);
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

	server.tool(
		"fillTextToReadableElement",
		toolsInputPort.fillTextToReadableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID to target"),
			index: z.number().describe("Element index from getReadableElements"),
			value: z.string().describe("Text to enter into the input field"),
		},
		async ({ tabId, index, value }) => {
			await toolsInputPort.fillTextToReadableElement(tabId, index, value);
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

	server.tool(
		"clickOnReadableElement",
		toolsInputPort.clickOnReadableElementInstruction(),
		{
			tabId: z.string().describe("Tab ID to target"),
			index: z.number().describe("Element index from getReadableElements"),
		},
		async ({ tabId, index }) => {
			await toolsInputPort.clickOnReadableElement(tabId, index);
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
			const result = await toolsInputPort.invokeJsFn(tabId, fnBodyCode);
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

	return server;
};

export const startMcpServer = async () => {
	try {
		const server = await createServer();
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error("MCP Browser Kit Server running on stdio");
	} catch (error) {
		console.error("Fatal error in main():", error);
		process.exit(1);
	}
};
