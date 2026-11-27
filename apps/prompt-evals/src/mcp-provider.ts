import { fileURLToPath } from "node:url";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import {
	dynamicTool,
	generateText,
	jsonSchema,
	type ModelMessage,
	stepCountIs,
	type ToolSet,
} from "ai";
import type { ProviderResponse } from "promptfoo";
import { FakeMcpBrowser, type FakeMcpBrowserOptions } from "./fake-mcp-browser";

interface McpProviderConfig {
	/** OpenAI-compatible endpoint serving `model`. */
	baseUrl: string;
	/** Environment variable that holds the API key for `baseUrl`. */
	apiKeyEnv: string;
	model: string;
	/** Built MCP server entry point; defaults to the server app's tsup output. */
	serverPath?: string;
	/** Model steps per test, each one a completion that may call tools. */
	maxSteps?: number;
	maxOutputTokens?: number;
}

interface CallContext {
	vars: Record<string, unknown>;
}

interface CallOptions {
	abortSignal?: AbortSignal;
}

const DEFAULT_SERVER_PATH = fileURLToPath(
	new URL("../../server/target/tsup/dist/main.js", import.meta.url),
);

const toolListCache = new Map<string, Promise<McpTool[]>>();

/** Lists the tools the built server registers, so names, descriptions and schemas are the real ones. */
const listServerTools = (serverPath: string): Promise<McpTool[]> => {
	let tools = toolListCache.get(serverPath);
	if (!tools) {
		tools = (async () => {
			const client = new Client({
				name: "mbk-prompt-evals",
				version: "0.0.0",
			});
			await client.connect(
				new StdioClientTransport({
					command: process.execPath,
					args: [
						serverPath,
					],
					stderr: "ignore",
				}),
			);
			try {
				return (await client.listTools()).tools;
			} finally {
				await client.close();
			}
		})();
		toolListCache.set(serverPath, tools);
	}
	return tools;
};

const toMessages = (
	prompt: string,
): {
	instructions?: string;
	messages: ModelMessage[];
} => {
	let messages: ModelMessage[] = [
		{
			role: "user",
			content: prompt,
		},
	];
	try {
		const parsed = JSON.parse(prompt);
		if (Array.isArray(parsed)) messages = parsed as ModelMessage[];
	} catch {
		// A plain-text prompt is the user message.
	}
	const system = messages
		.filter((message) => message.role === "system")
		.map((message) => message.content as string);
	return {
		instructions: system.length > 0 ? system.join("\n\n") : undefined,
		messages: messages.filter((message) => message.role !== "system"),
	};
};

/**
 * promptfoo provider for an MCP client: offers the server's real tools to the
 * model and loops over several steps, answering tool calls from a fake browser
 * so the model can read before it acts.
 */
export default class McpClientProvider {
	private readonly providerId: string;
	private readonly config: McpProviderConfig;

	constructor(options: {
		id?: string;
		label?: string;
		config: McpProviderConfig;
	}) {
		this.config = options.config;
		this.providerId = options.label ?? options.id ?? "mcp-client";
	}

	id = (): string => this.providerId;

	callApi = async (
		prompt: string,
		context: CallContext,
		options?: CallOptions,
	): Promise<ProviderResponse> => {
		const { baseUrl, apiKeyEnv, model } = this.config;
		if (!baseUrl) {
			return {
				error: "Provider config baseUrl is empty",
			};
		}
		const apiKey = process.env[apiKeyEnv];
		if (!apiKey) {
			return {
				error: `Missing environment variable ${apiKeyEnv}`,
			};
		}

		const browser = new FakeMcpBrowser(
			context.vars as unknown as FakeMcpBrowserOptions,
		);
		const serverTools = await listServerTools(
			this.config.serverPath ?? DEFAULT_SERVER_PATH,
		);
		const tools: ToolSet = Object.fromEntries(
			serverTools.map((serverTool) => [
				serverTool.name,
				dynamicTool({
					description: serverTool.description,
					inputSchema: jsonSchema(serverTool.inputSchema),
					execute: async (input) =>
						browser.call(
							serverTool.name,
							(input ?? {}) as Record<string, unknown>,
							serverTool.inputSchema.required ?? [],
						),
				}),
			]),
		);

		const provider = createOpenAICompatible({
			name: this.providerId,
			// biome-ignore lint/style/useNamingConvention: the provider's required option key.
			baseURL: baseUrl,
			apiKey,
		});
		const metadata = () => ({
			toolCalls: browser.calls,
		});
		try {
			const result = await generateText({
				model: provider.chatModel(model),
				...toMessages(prompt),
				tools,
				stopWhen: stepCountIs(this.config.maxSteps ?? 6),
				maxOutputTokens: this.config.maxOutputTokens,
				abortSignal: options?.abortSignal,
			});
			const usage = result.totalUsage;
			const output = result.text;
			if (!output && browser.calls.length === 0) {
				return {
					error: `No output (finishReason: ${result.finishReason})`,
					metadata: metadata(),
				};
			}
			return {
				output,
				tokenUsage: {
					prompt: usage.inputTokens,
					completion: usage.outputTokens,
					total: usage.totalTokens,
					numRequests: result.steps.length,
				},
				metadata: metadata(),
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
				metadata: metadata(),
			};
		}
	};
}
