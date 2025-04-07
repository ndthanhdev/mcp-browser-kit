import type { Func } from "@mcp-browser-kit/types";
import type { Get, Paths } from "type-fest";
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

export const setupContentScriptTools = () => {
	const theGlobal = globalThis as unknown as {
		[contentToolsIdentifier]: typeof contentTools;
	};

	if (!theGlobal[contentToolsIdentifier]) {
		theGlobal[contentToolsIdentifier] = contentTools;
	}
};
