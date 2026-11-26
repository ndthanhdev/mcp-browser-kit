import { mcpServerPrompts } from "@mcp-browser-kit/driven-prompt-provider/prompts";
import {
	type ElementsFixtureName,
	elements,
	type McpContextFixture,
	mcpContexts,
} from "./fixtures";

interface McpPromptVars {
	task: string;
	context?: McpContextFixture;
	elements?: ElementsFixtureName;
	notes?: string;
}

interface ChatMessage {
	role: "system" | "user";
	content: string;
}

const CLIENT_INSTRUCTIONS = [
	"You are an assistant that operates the user's local browser through the MCP Browser Kit tools.",
	"This client has no MCP resource support: use the tool equivalents (getContext, getReadableText, getReadableElements, getSnapshotPage) instead of resources/read.",
	"Act on the request directly with tool calls; do not ask the user for confirmation unless the server instructions require a human step.",
].join("\n");

const jsonBlock = (title: string, value: unknown): string =>
	`${title}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

const userMessage = (vars: McpPromptVars): string => {
	const sections = [
		vars.task,
	];
	if (vars.context) {
		sections.push(
			jsonBlock(
				"Browser context (getContext result from a moment ago):",
				mcpContexts[vars.context],
			),
		);
	}
	if (vars.elements) {
		const { tab, records } = elements[vars.elements];
		sections.push(
			jsonBlock(
				`Readable elements of tab ${tab.id} "${tab.title}" (getReadableElements result from a moment ago):`,
				{
					snapshotId: `s-${vars.elements}`,
					data: records,
					hasNextPage: false,
					totalPages: 1,
				},
			),
		);
	}
	if (vars.notes) {
		sections.push(vars.notes);
	}
	return sections.join("\n\n");
};

/**
 * Chat prompt for an MCP client: the server instructions are the system prompt,
 * as real MCP clients send them.
 */
export default ({ vars }: { vars: McpPromptVars }): ChatMessage[] => [
	{
		role: "system",
		content: `${mcpServerPrompts.instructions}\n\n${CLIENT_INSTRUCTIONS}`,
	},
	{
		role: "user",
		content: userMessage(vars),
	},
];
