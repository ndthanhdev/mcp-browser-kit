import type { ExtensionInfo } from "./extension-info";
import type { ExtensionToolName } from "./extension-tools";
import type { ExtensionTabInfo } from "./tab";

export interface ExtensionContext {
	/**
	 * The tabs that are available to the extension.
	 */
	availableTabs: ExtensionTabInfo[];
	/**
	 * The tools that are available to execute on this extension context.
	 * This browser and user's configuration.
	 */
	availableTools: ExtensionToolName[];
	/**
	 * The information about the extension.
	 */
	extensionInfo: ExtensionInfo;
}
