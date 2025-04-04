import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { rpcClient } from "./rpc-client";

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

server.tool(
	"getTabs",
	[
		combinationDescription,
		"⚠️ CRITICAL FIRST STEP - ALWAYS START HERE BEFORE ANY OTHER TOOLS!",
		"* This tool MUST be called first to obtain the list of open browser tabs.",
		"* Each tab includes a unique ID that is required for all subsequent tool operations.",
		"* Note which tab is active (marked with 'active: true') as this is essential information.",
		"* The tabId from this list is required for captureActiveTab and all other interactions.",
		"* Workflow: 1) getTabs → 2) captureActiveTab → 3) interact with elements",
	].join("\n"),
	{},
	async () => {
		const tabs = await rpcClient.defer("getTabs");
		return {
			content: [
				{
					type: "text",
					text: `Tabs: ${JSON.stringify(tabs)}`,
				},
			],
		};
	}
);

server.tool(
	"captureActiveTab",
	[
		combinationDescription,
		"⚠️ SECOND REQUIRED STEP - AFTER getTabs AND BEFORE ANY INTERACTION!",
		"* SEQUENCE: First call getTabs to get tabId → Then use captureActiveTab with that tabId",
		 "* IMPORTANT: This tool ONLY works for the ACTIVE tab (marked with 'active: true' in getTabs results).",
		"* If you need to work with an INACTIVE tab, use the Readable tools instead (getReadableElements + clickOnReadableElement).",
		"* ALWAYS capture a screenshot before attempting interaction with the active tab.",
		"* FOR ACTIVE TAB, VISIBLE ELEMENTS: Use coordinate-based Viewable tools (clickOnViewableElement, fillTextToViewableElement).",
		"* FOR INACTIVE TABS or HIDDEN ELEMENTS: Use Readable tools (getReadableElements + clickOnReadableElement/fillTextToReadableElement).",
		"* DECISION RULE: Active tab visible elements → Viewable tools. Inactive tabs or hidden elements → Readable tools.",
		"* Returns visual context showing exactly where form fields, buttons, and other UI elements are located.",
		"* After any page change or navigation, YOU MUST capture a new screenshot before further interactions.",
	].join("\n"),
	{},
	async () => {
		const screenshot = await rpcClient.defer("captureActiveTab");
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
	}
);

server.tool(
	"getInnerText",
	[
		combinationDescription,
		"⚠️ FASTEST & MOST EFFICIENT TEXT EXTRACTION TOOL",
		"* PREFERRED FIRST CHOICE for any task that only needs to read text (no interaction required).",
		"* Much faster and more efficient than capturing screenshots for text-only operations.",
		"* Extracts all readable text content from the specified tab in a single call.",
		"* Ideal for: content analysis, information extraction, summarization, and search tasks.",
		"* Perfect for generating suggestions, answering questions, or analyzing page content.",
		"* Use this BEFORE screenshot capture when you only need to understand text context.",
		"* Works on any tab using tabId from getTabs, not just active tabs.",
		"* WARNING: This text extraction cannot be used for direct element interaction.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to extract text from"),
	},
	async ({ tabId }) => {
		const innerText = await rpcClient.defer("getInnerText", tabId);
		return {
			content: [
				{
					type: "text",
					text: `InnerText: ${JSON.stringify(innerText)}`,
				},
			],
		};
	}
);

server.tool(
	"getReadableElements",
	[
		combinationDescription,
		 "* Returns an indexed list of all interactive elements in the format: [index, HTML tag, accessible text].",
		"* This creates a map of elements you can interact with programmatically.",
		"* The element indexes can be used with clickOnReadableElement and fillTextToReadableElement.",
		"* Ideal for forms, navigation menus, and interactive page components.",
		"* Use with tabId from getTabs to target specific tabs.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to extract elements from"),
	},
	async ({ tabId }) => {
		const elements = await rpcClient.defer("getReadableElements", tabId);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(elements),
				},
			],
		};
	}
);

server.tool(
	"clickOnViewableElement",
	[
		combinationDescription,
		"⚠️ PREFERRED TOOL - Use this FIRST for ANY element visible in the screenshot from captureActiveTab!",
		"* Works on the ACTIVE tab for any element you can SEE in the viewport screenshot.",
		"* FIRST CHOICE: Always prefer this tool over clickOnReadableElement when the target is visible.",
		"* Simulates a mouse click at the exact (x,y) coordinates specified.",
		"* Use captureActiveTab → identify target element → determine its CENTER coordinates → use this tool.",
		"* Calculate the center by finding the midpoint of the element's width and height.",
		"* For buttons and links, always aim for the center to ensure proper click registration.",
		 "* If this tool fails or element is outside viewport, THEN try clickOnReadableElement as a fallback.",
		"* After clicking, capture another screenshot to verify the action succeeded.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID of the active tab"),
		x: z.number().describe("X coordinate (pixels) of the element to click"),
		y: z.number().describe("Y coordinate (pixels) of the element to click"),
	},
	async ({ tabId, x, y }) => {
		await rpcClient.defer("clickOnViewableElement", tabId, x, y);
		return {
			content: [
				{
					type: "text",
					text: "Done",
				},
			],
		};
	}
);

server.tool(
	"fillTextToViewableElement",
	[
		combinationDescription,
		"⚠️ PREFERRED TOOL - Use this FIRST for ANY input field visible in the screenshot from captureActiveTab!",
		"* Works on the ACTIVE tab for any input field you can SEE in the viewport screenshot.",
		"* FIRST CHOICE: Always prefer this tool over fillTextToReadableElement when the input field is visible.",
		"* Sets text value for an input element at the specified (x,y) coordinates.",
		"* Use captureActiveTab → identify input field → determine its CENTER coordinates → use this tool.",
		"* Calculate the center by finding the midpoint of the input field's width and height.",
		"* Clicking on the center ensures the field is properly selected before text entry.",
		"* If this tool fails or input field is outside viewport, THEN try fillTextToReadableElement as a fallback.",
		"* For multi-step forms, fill all inputs before submitting the form.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID of the active tab"),
		x: z.number().describe("X coordinate (pixels) of the input element"),
		y: z.number().describe("Y coordinate (pixels) of the input element"),
		value: z.string().describe("Text to enter into the input field"),
	},
	async ({ tabId, x, y, value }) => {
		await rpcClient.defer("fillTextToViewableElement", tabId, x, y, value);
		return {
			content: [
				{
					type: "text",
					text: "Done",
				},
			],
		};
	}
);

server.tool(
	"fillTextToReadableElement",
	[
		combinationDescription,
		"⚠️ FALLBACK TOOL - Only use when fillTextToViewableElement cannot help!",
		"* Use this tool ONLY if fillTextToViewableElement failed or the input field is not visible.",
		"* Acts as a direct fallback when coordinate-based interaction with visible elements doesn't work.",
		"* Sets text value for an input element identified by its index from getReadableElements.",
		"* Works on any tab, not just the active one.",
		"* Run getReadableElements first to obtain the correct element index.",
		"* Use when form fields are not visible without scrolling or are in iframes/embedded content.",
		"* Also effective for cases where coordinate-based interaction failed or is unreliable.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to target"),
		index: z.number().describe("Element index from getReadableElements"),
		value: z.string().describe("Text to enter into the input field"),
	},
	async ({ tabId, index, value }) => {
		await rpcClient.defer("fillTextToReadableElement", tabId, index, value);
		return {
			content: [
				{
					type: "text",
					text: "Done",
				},
			],
		};
	}
);

server.tool(
	"clickOnReadableElement",
	[
		combinationDescription,
		"⚠️ FALLBACK TOOL - Only use when clickOnViewableElement cannot help!",
		"* Use this tool ONLY if clickOnViewableElement failed or the target element is not visible.",
		"* Acts as a direct fallback when coordinate-based clicking on visible elements doesn't work.",
		"* Clicks on an element identified by its index from getReadableElements.",
		"* Works on any tab, not just the active one.",
		"* Run getReadableElements first to obtain the correct element index.",
		"* Use when buttons/links are not visible without scrolling or are in iframes/embedded content.",
		"* Also effective for cases where coordinate-based clicking failed or is unreliable.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to target"),
		index: z.number().describe("Element index from getReadableElements"),
	},
	async ({ tabId, index }) => {
		await rpcClient.defer("clickOnReadableElement", tabId, index);
		return {
			content: [
				{
					type: "text",
					text: "Done",
				},
			],
		};
	}
);

server.tool(
	"invokeJsFn",
	[
		combinationDescription,
		"⚠️ USE THIS TOOL AS A LAST RESORT ONLY.",
		"* Executes custom JavaScript code directly in the page context.",
		"* Only use when standard tools (clicking, text input) cannot accomplish the task.",
		"* The JavaScript function body must be self-contained and return a serializable value.",
		"* Useful for complex interactions, custom data extraction, or handling dynamic elements.",
		"* Example: scrolling, accessing hidden elements, or interacting with complex widgets.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to run JavaScript in"),
		fnBodyCode: z.string().describe("JavaScript function body to execute in page context"),
	},
	async ({ tabId, fnBodyCode }) => {
		const result = await rpcClient.defer("invokeJsFn", tabId, fnBodyCode);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(result) ?? "undefined",
				},
			],
		};
	}
);

export const startMcpServer = async () => {
	try {
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error("MCP Browser Kit Server running on stdio");
	} catch (error) {
		console.error("Fatal error in main():", error);
		process.exit(1);
	}
};
