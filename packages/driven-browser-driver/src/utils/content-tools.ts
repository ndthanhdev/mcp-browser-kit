import * as animation from "./animation-tools";

export const contentTools = {
	animation,
};

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
