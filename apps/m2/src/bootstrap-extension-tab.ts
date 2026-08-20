import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { ExtensionTabLifecycle } from "@mcp-browser-kit/helper-extension-tab-lifecycle";

// Content-script entry: wire and start the tab half of the browser driver.
ExtensionTabLifecycle.start(DrivenBrowserDriverM2);
