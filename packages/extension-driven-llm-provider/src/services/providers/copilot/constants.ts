/**
 * Constants for talking to GitHub Copilot's chat backend.
 *
 * ⚠️ READ THIS BEFORE EDITING ⚠️
 *
 * GitHub publishes no third-party API for Copilot *subscriptions*. Everything in
 * this file was derived from observing the official editor plugins, and reaching
 * these endpoints requires presenting an editor's OAuth client id and editor
 * version headers. That means:
 *
 *   - it is undocumented and unversioned, and can break without notice;
 *   - it is contrary to the Copilot terms of service;
 *   - accounts using it may be rate-limited or flagged.
 *
 * It is therefore gated behind the `copilot-provider` feature flag, which
 * defaults to OFF. Do not enable it by default, and do not remove the warning
 * from the settings UI. Users who want a supported path should prefer
 * OpenRouter, or GitHub Models (`https://models.github.ai/inference`) with a
 * personal access token.
 *
 * This is deliberately the ONLY file containing the impersonation details, so
 * the blast radius of removing the feature is one directory.
 */

/**
 * The OAuth client id the official editor integration uses for its device flow.
 * GitHub only issues Copilot tokens to allow-listed clients, so a client id
 * registered for this extension would be rejected at the token-exchange step.
 */
export const COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";

/** GitHub's device-flow endpoints. */
export const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
export const GITHUB_ACCESS_TOKEN_URL =
	"https://github.com/login/oauth/access_token";

/**
 * Exchanges the long-lived `gho_…` OAuth token for a short-lived Copilot bearer.
 * The response also carries the API base URL to use, which differs for
 * Copilot Enterprise and proxied accounts — always prefer it over a hardcoded
 * host.
 */
export const COPILOT_TOKEN_EXCHANGE_URL =
	"https://api.github.com/copilot_internal/v2/token";

/** Fallback when the token response omits `endpoints.api`. */
export const COPILOT_DEFAULT_API_BASE_URL = "https://api.githubcopilot.com";

/** Identifies the signed-in account for display in the settings UI. */
export const GITHUB_USER_URL = "https://api.github.com/user";

/**
 * Scope requested in the device flow. `read:user` is the minimum that still
 * yields a token the Copilot exchange accepts, and lets us show which account
 * is signed in.
 */
export const COPILOT_OAUTH_SCOPE = "read:user";

/**
 * Headers the Copilot backend requires on every chat request. Requests without
 * them are rejected with 400/403.
 */
export const COPILOT_EDITOR_HEADERS: Readonly<Record<string, string>> = {
	"editor-version": "vscode/1.99.0",
	"editor-plugin-version": "copilot-chat/0.26.0",
	"copilot-integration-id": "vscode-chat",
	"user-agent": "GitHubCopilotChat/0.26.0",
};

/**
 * Refresh the Copilot bearer this long before it expires. Turns are multi-step
 * and each step is a fresh request, so a token that is merely "not expired yet"
 * when the turn starts can still expire mid-loop.
 */
export const COPILOT_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

/**
 * Give up on device-flow polling after this long. GitHub's own `expires_in` is
 * ~15 minutes; this is a backstop so a forgotten sign-in doesn't poll forever in
 * a service worker.
 */
export const COPILOT_DEVICE_FLOW_TIMEOUT_MS = 15 * 60 * 1000;
