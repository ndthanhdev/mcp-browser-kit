import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

// The background's tRPC channel to the MCP server must outlive the worker's
// idle timeout.
ExtensionTabLifecycle.start({
	keepAlive: true,
});
