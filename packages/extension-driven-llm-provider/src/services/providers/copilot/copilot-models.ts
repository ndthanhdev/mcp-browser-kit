import type { LlmModelDescriptor } from "../../agent-settings-storage";
import type { CopilotModelEntry } from "./wire-types";

/**
 * Reduce a raw `GET /models` payload to the models this agent can actually use.
 *
 * Two filters matter:
 *
 * - `capabilities.type === "chat"` drops embedding models, which share the
 *   endpoint but can't hold a conversation.
 * - `supports.tool_calls` is the important one: `BrowserAgentUseCase` is a tool
 *   loop, so a model without tool calling produces a session that silently never
 *   touches the browser. Better to hide it than to let a user pick it.
 *
 * Duplicate ids are collapsed — Copilot lists some models once per picker group.
 */
export const selectUsableCopilotModels = (
	entries: readonly CopilotModelEntry[],
): LlmModelDescriptor[] => {
	const seen = new Set<string>();
	const usable: LlmModelDescriptor[] = [];

	for (const entry of entries) {
		if (!entry.id || seen.has(entry.id)) {
			continue;
		}
		if (entry.capabilities?.type !== "chat") {
			continue;
		}
		if (entry.capabilities.supports?.tool_calls !== true) {
			continue;
		}
		// `model_picker_enabled: false` marks internal/deprecated aliases that the
		// official UI hides; absent means "show it".
		if (entry.model_picker_enabled === false) {
			continue;
		}
		seen.add(entry.id);
		usable.push({
			id: entry.id,
			label: entry.name ?? entry.id,
		});
	}

	return usable;
};
