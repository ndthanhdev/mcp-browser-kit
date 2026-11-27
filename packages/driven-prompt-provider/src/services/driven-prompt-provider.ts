import {
	type BrowserAgentPrompts,
	type McpServerPrompts,
	PromptProviderOutputPort,
} from "@mcp-browser-kit/core-prompts";
import { type Container, injectable } from "inversify";
import { browserAgentPrompts } from "../content/browser-agent";
import { mcpServerPrompts } from "../content/mcp-server";

/** Serves the prompts bundled with this package. */
@injectable()
export class DrivenPromptProvider implements PromptProviderOutputPort {
	mcpServer = (): McpServerPrompts => mcpServerPrompts;

	browserAgent = (): BrowserAgentPrompts => browserAgentPrompts;

	static setupContainer(
		container: Container,
		serviceIdentifier: symbol = PromptProviderOutputPort,
	): void {
		container
			.bind<PromptProviderOutputPort>(serviceIdentifier)
			.to(DrivenPromptProvider);
	}
}
