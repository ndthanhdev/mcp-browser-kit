import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

/**
 * The tab half of the browser driver.
 *
 * The background owns the agent, but only a content script can touch a page's
 * DOM — so every `clickOnElement` / `fillTextToElement` / `getReadableElements`
 * call ultimately lands here. Previously this entrypoint matched
 * `*://*.google.com/*` and its body was a `console.log`, which meant the agent
 * could reason but never act.
 *
 * `all_frames` + `document_start` mirror `apps/m3`: iframe tools need every
 * frame, and running at `document_start` means the mutation observer sees the
 * page's own initial render rather than starting mid-load.
 *
 * Everything this script imports is paid for in every frame of every page, so
 * imports here are deliberately narrow: no `core-js/proposals` (unlike
 * `background.ts`), and nothing that reaches a package barrel. There is no
 * manifest-version branch either — the tab half is identical on MV2 and MV3.
 */
export default defineContentScript({
	matches: [
		"<all_urls>",
	],
	allFrames: true,
	runAt: "document_start",
	main() {
		// No keepAlive: unlike m2/m3 this app's background holds no MCP server
		// channel, and the sidepanel's `runtime.connect` port already keeps the
		// worker alive for exactly as long as the agent needs it. Pinging from
		// every frame of every tab would pin the worker awake permanently — and
		// this background registers no listener, so every ping would fail.
		//
		ExtensionTabLifecycle.start();
	},
});
