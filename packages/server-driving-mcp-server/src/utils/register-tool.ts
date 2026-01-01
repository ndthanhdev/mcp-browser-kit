import type { ServerToolName } from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";

type ZodObjectShape = Record<string, z.ZodType>;

interface ToolConfig<
	TInput extends ZodObjectShape,
	TOutput extends ZodObjectShape | undefined,
> {
	description: string;
	inputSchema: TInput;
	outputSchema?: TOutput;
}

/**
 * Type-safe wrapper for server.registerTool that enforces the tool name
 * to be a valid ServerToolName while preserving schema-to-handler type inference
 */
export const registerTool = <
	TInput extends ZodObjectShape,
	TOutput extends ZodObjectShape | undefined = undefined,
>(
	server: McpServer,
	name: ServerToolName,
	config: ToolConfig<TInput, TOutput>,
	handler: ToolCallback<TInput>,
): void => {
	server.registerTool(name, config, handler);
};
