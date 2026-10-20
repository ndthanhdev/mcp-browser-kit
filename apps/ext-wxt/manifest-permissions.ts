/**
 * `storage` holds the agent settings; `tabs` and `webNavigation` are required
 * by the browser driver's tools.
 */
export const PERMISSIONS = [
	"storage",
	"tabs",
	"webNavigation",
] as const;

/**
 * Broad on purpose: the browser driver acts on any origin, and host permissions
 * exempt the background's LLM requests from CORS for user-defined (including
 * plain-http local) endpoints.
 */
export const HOST_PERMISSIONS = [
	"http://*/*",
	"https://*/*",
] as const;
