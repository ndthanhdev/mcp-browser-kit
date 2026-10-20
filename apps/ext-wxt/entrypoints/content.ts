import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

/**
 * The tab half of the browser driver: the agent's DOM tools run here.
 *
 * `allFrames` lets iframe tools reach every frame, and `document_start` lets
 * the mutation observer see the page's initial render.
 *
 * Imports are paid for in every frame of every page, so keep them narrow: no
 * `core-js/proposals` and nothing that reaches a package barrel.
 */
export default defineContentScript({
	matches: [
		"<all_urls>",
	],
	allFrames: true,
	runAt: "document_start",
	main() {
		// No keepAlive: the sidepanel's `runtime.connect` port keeps the worker
		// alive, and this background registers no keep-alive listener.
		ExtensionTabLifecycle.start();
	},
});
