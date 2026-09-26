/**
 * Manifest permissions for the extension.
 *
 * `tabs` and `webNavigation` are required by the browser driver's tools.
 * Mirrors `apps/m3/src/manifest.json`.
 */
export const PERMISSIONS = [
	"tabs",
	"webNavigation",
] as const;

/**
 * Broad on purpose, for two reasons.
 *
 * The browser driver injects into and reads from whatever tab the agent is
 * pointed at, which can be any origin.
 *
 * LLM connections are also called from the background. A service worker's
 * `fetch` is subject to CORS, provider endpoints don't send CORS headers, and
 * a host permission is what exempts the request. Connection base URLs are
 * user-defined and include plain-http local servers (Ollama, LM Studio).
 */
export const HOST_PERMISSIONS = [
	"http://*/*",
	"https://*/*",
] as const;
