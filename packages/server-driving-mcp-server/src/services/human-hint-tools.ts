import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import {
	McpDescriptionsInputPort,
	type McpDescriptionsInputPort as McpDescriptionsInputPortInterface,
	ServerToolCallsInputPort,
	type ServerToolCallsInputPort as ServerToolCallsInputPortInterface,
} from "@mcp-browser-kit/core-server/input-ports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inject, injectable } from "inversify";
import { registerTool } from "../utils/register-tool";
import {
	showHumanHintInputSchema,
	showHumanHintOutputSchema,
} from "../utils/tool-schemas";

@injectable()
export class HumanHintTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(ServerToolCallsInputPort)
		private readonly toolsInputPort: ServerToolCallsInputPortInterface,
		@inject(McpDescriptionsInputPort)
		private readonly toolDescriptionsInputPort: McpDescriptionsInputPortInterface,
	) {
		this.logger = loggerFactory.create("humanHintTools");
	}

	register(server: McpServer): void {
		this.logger.verbose("Registering tool: showHumanHint");
		registerTool(
			server,
			"showHumanHint",
			{
				description: this.toolDescriptionsInputPort.showHumanHintInstruction(),
				inputSchema: showHumanHintInputSchema,
				outputSchema: showHumanHintOutputSchema,
			},
			async ({ tabKey, action, message, value, readablePath, x, y }) => {
				this.logger.info("Executing showHumanHint", {
					tabKey,
					action,
				});

				const result = await this.toolsInputPort.showHumanHint(tabKey, {
					action,
					message,
					value,
					readablePath,
					x,
					y,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: result.humanMessage,
						},
					],
					structuredContent: {
						...result,
					},
				};
			},
		);
	}
}
