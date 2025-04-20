import type { Func } from "@mcp-browser-kit/types";
import type { Get, Paths } from "type-fest";
import * as R from "ramda";
import * as animation from "./animation-tools";
import * as dom from "./dom-tools";

export const contentTools = {
	animation,
	dom,
};

export type ContentTools = typeof contentTools;

export type ToolKeys = Paths<
	ContentTools,
	{ bracketNotation: false; maxRecursionDepth: 2 }
>;

export type GetTool<T extends ToolKeys> = Get<ContentTools, T> extends Func
	? Get<ContentTools, T>
	: never;

export const contentToolsIdentifier = "$mcpBrowserKit";

declare global {
	var $mcpBrowserKit: typeof contentTools;
}

const theGlobal = globalThis as unknown as {
	[contentToolsIdentifier]: typeof contentTools;
};

/**
 * Sets up the content script tools in the global scope.
 */
export const setupContentScriptTools = () => {
	if (!theGlobal[contentToolsIdentifier]) {
		theGlobal[contentToolsIdentifier] = contentTools;
	}
};

export interface CallToolArgs<T extends ToolKeys> {
	tool: T;
	args: Parameters<GetTool<T>> extends never
		? undefined
		: Parameters<GetTool<T>>;
}

export const callTool = async <T extends ToolKeys>({
	tool,
	args,
}: CallToolArgs<T>): Promise<ReturnType<GetTool<T>>> => {
	const toolFunction = R.pathOr(
		undefined,
		[contentToolsIdentifier, ...tool.split(".")],
		theGlobal,
	) as GetTool<T> | undefined;

	if (toolFunction) {
		return await toolFunction.apply(undefined, args as Parameters<GetTool<T>>);
	}

	throw new Error(`Tool ${tool} not found`);
};
