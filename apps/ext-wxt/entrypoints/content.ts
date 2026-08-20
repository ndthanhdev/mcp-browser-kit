import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/extension-driven-browser-driver/m3";
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
 * Note there is deliberately no `import "core-js/proposals"` here, unlike
 * `background.ts`. This script is injected into every frame of every page, so
 * its size is paid over and over; core-js costs 161 KB and buys nothing, since
 * `reflect-metadata` — the only part the DI decorators need — arrives via
 * inversify regardless. `apps/m3`'s equivalent entry has never imported it.
 */
export default defineContentScript({
	matches: [
		"<all_urls>",
	],
	allFrames: true,
	runAt: "document_start",
	main() {
		// WXT inlines MANIFEST_VERSION at build time, so the unused driver is
		// tree-shaken. Chromium builds MV3; Firefox builds MV2.
		const driver =
			import.meta.env.MANIFEST_VERSION === 3
				? DrivenBrowserDriverM3
				: DrivenBrowserDriverM2;

		// No keepAlive: unlike m2/m3 this app's background holds no MCP server
		// channel, and the sidepanel's `runtime.connect` port already keeps the
		// worker alive for exactly as long as the agent needs it. Pinging from
		// every frame of every tab would pin the worker awake permanently — and
		// this background never registers the listener, so every ping would fail.
		ExtensionTabLifecycle.start(driver);
	},
});
