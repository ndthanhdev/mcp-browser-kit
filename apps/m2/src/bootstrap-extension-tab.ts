import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

// Content-script entry: wire and start the tab half of the browser driver.
//
// keepAlive is on because this app's background holds the tRPC channel to the
// local MCP server, which must outlive the service worker's idle timeout.
// `ExtensionLifecycle` answers the pings from `bootstrap-extension.ts`.
ExtensionTabLifecycle.start({
	keepAlive: true,
});
