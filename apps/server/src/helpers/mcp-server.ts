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
		"# Description",
		"- This tool returns the overview of the current tabs on user's Browser.",
		"- Usually being called before other tools to get a specific tabId to read/interact with.",
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
	"getInnerText",
	[
		combinationDescription,
		"- Use this tool to get the innerText of the current tab.",
		"- Usually being called after `getTabs` to read or identify element to interact with.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to evaluate the code in"),
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
		"- Use this tool to get a list of [index,tag,accessible-text] of all readable elements in the current tab.",
		"- Usually being called after `getTabs` to read or identify element to interact with.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to evaluate the code in"),
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
	"fillTextToIndex",
	[
		combinationDescription,
		"- Use this tool to set value to the ReadableElement at the specified index.",
		"- For tasks requiring user input (text, numbers, passwords, etc.), such as fill form before submit, fill text before search, fill username & password before login",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to evaluate the code in"),
		index: z.number().describe("Index of the element to set value"),
		value: z.string().describe("Value to set"),
	},
	async ({ tabId, index, value }) => {
		await rpcClient.defer("fillTextToIndex", tabId, index, value);
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
	"clickOnIndex",
	[
		combinationDescription,
		"- Use this tool to click on ReadableElement at the specified index.",
		"- For tasks that involve clicking, like buttons, links, etc.",
		"- Usually being called after `getReadableElements` to interact with the element.",
		"- If the task potentially requires filling inputs, use `fillTextToIndex` first.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to evaluate the code in"),
		index: z.number().describe("Index of the element to click"),
	},
	async ({ tabId, index }) => {
		await rpcClient.defer("clickOnIndex", tabId, index);
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
		"# Description",
		"- Use this tool only if action cannot be performed via series of clicks and types.",
		"- Use this tool to evaluate a JavaScript function body in the context of the page.",
		"- Usually being called after `getReadableElements` to interact with the element.",
	].join("\n"),
	{
		tabId: z.string().describe("Tab ID to evaluate the code in"),
		fnBodyCode: z.string().describe("A JavaScript function body to evaluate"),
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
