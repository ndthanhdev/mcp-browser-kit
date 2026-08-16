import type { ExtensionToolName } from "@mcp-browser-kit/core-extension";

/**
 * A rendered row in the chat thread.
 *
 * Purely a view model. The live agent reports progress as an
 * `AgentProgressEvent` stream, where a tool call and its result are two events
 * and assistant text arrives as many — folding that stream into these rows is
 * the job of whatever eventually feeds this UI, not of the components.
 */
export type ThreadItem =
	| {
			kind: "user";
			id: string;
			at: number;
			content: string;
	  }
	| {
			kind: "assistant";
			id: string;
			at: number;
			content: string;
			/** The turn is still producing this message. */
			streaming: boolean;
	  }
	| {
			kind: "tool";
			id: string;
			at: number;
			toolName: ExtensionToolName;
			args: unknown[];
			/** Absent while the tool is still running. */
			ok?: boolean;
			result?: unknown;
			reason?: string;
	  }
	| {
			kind: "error";
			id: string;
			at: number;
			message: string;
	  }
	| {
			kind: "aborted";
			id: string;
			at: number;
	  };
