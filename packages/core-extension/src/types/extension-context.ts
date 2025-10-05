import type { BrowserInfo } from "./browser-info";
import type { ExtensionInfo } from "./extension-info";
import type { ExtensionTabInfo } from "./extension-tab-info";
import type { ExtensionToolName } from "./extension-tools";
import type { ExtensionWindowInfo } from "./extension-window-info";

export interface ExtensionContext {
	/**
	 * The windows that are available to the extension.
	 */
	availableWindows: ExtensionWindowInfo[];
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
	/**
	 * The information about the browser.
	 */
	browserInfo: BrowserInfo;
	/**
	 * Unique Id of the extension instance.
	 */
	browserId: string;
}
