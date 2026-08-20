import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/extension-driven-browser-driver/m3";
import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

// Content-script entry: wire and start the tab half of the browser driver.
ExtensionTabLifecycle.start(DrivenBrowserDriverM3);
