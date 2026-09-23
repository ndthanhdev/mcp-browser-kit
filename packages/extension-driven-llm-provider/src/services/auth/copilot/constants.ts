/**
 * Constants for talking to GitHub Copilot.
 *
 * This file used to carry a terms-of-service warning, because the adapter
 * reached Copilot by presenting an editor's OAuth client id and pretending to
 * be VS Code. It no longer does. GitHub exposes a versioned API at
 * {@link COPILOT_DEFAULT_API_BASE_URL}, and a client registered by this project
 * authenticates as itself:
 *
 *   - the device flow uses {@link COPILOT_CLIENT_ID}, our own GitHub App;
 *   - requests carry an honest {@link COPILOT_USER_AGENT};
 *   - the user's OAuth token is the bearer, with no `copilot_internal`
 *     token-exchange step;
 *   - {@link COPILOT_API_VERSION} pins the wire format, so a breaking change
 *     surfaces as a version error rather than silent drift.
 *
 * The shape of this was taken from OpenCode's `github-copilot` plugin, which
 * ships the same approach as a supported feature.
 */

/**
 * The OAuth client id of this project's GitHub App ("Browser Kit Agent").
 *
 * Verified end to end against the live API: device flow, `GET /models`, and a
 * chat completion all succeed with this id, an honest `User-Agent`, and no
 * token exchange. GitHub does **not** restrict Copilot to allow-listed editor
 * clients, which is what the previous implementation assumed.
 *
 This is an **OAuth App**, not a GitHub App. The two are distinct application
 * types with distinct client id prefixes — `Ov23li…` and `Iv23li…` — issuing
 * distinct tokens, `gho_` and `ghu_`. Every client known to reach Copilot is an
 * OAuth App, so this matches the ecosystem; a GitHub App authenticates equally
 * well but adds installation and visibility settings that turn out to affect
 * nothing here.
 *
 * It must keep **Device Flow enabled** and **token expiry disabled**: this
 * adapter treats the token as long-lived and has no refresh handling, so expiry
 * would break sign-ins ~8 hours later, far from the code responsible. Scopes
 * are unnecessary — this app requests none and Copilot works regardless.
 *
 * Re-verify a replacement before changing this:
 *
 *     moon run scripts:copilot-spike -- <CLIENT_ID>
 */
export const COPILOT_CLIENT_ID = "Ov23lic7dJAXzeA0rUde";

/**
 * Whether Copilot can be offered at all.
 *
 * Distinct from the `copilot-provider` feature flag: the flag is a policy
 * choice, this is a build-configuration fact. Without a client id there is no
 * sign-in to attempt.
 */
export const hasCopilotClientId = (
	clientId: string = COPILOT_CLIENT_ID,
): boolean => clientId.length > 0;

/**
 * Pins the Copilot wire format. GitHub dates its API versions; sending one
 * turns an incompatible change into an explicit error.
 */
export const COPILOT_API_VERSION = "2026-06-01";

/**
 * Identifies this extension honestly. The previous value impersonated
 * `GitHubCopilotChat/0.26.0`; nothing about the current integration depends on
 * looking like an editor.
 */
export const COPILOT_USER_AGENT = "mcp-browser-kit";

/** Default Copilot API host for github.com accounts. */
export const COPILOT_DEFAULT_API_BASE_URL = "https://api.githubcopilot.com";

/** Default GitHub host for the device flow. */
export const GITHUB_DEFAULT_DOMAIN = "github.com";

/** Strips scheme and trailing slash so a domain can be interpolated into a URL. */
export const normalizeDomain = (url: string): string =>
	url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/**
 * Copilot API host for a deployment.
 *
 * Enterprise (data-residency or self-hosted) accounts are served from
 * `copilot-api.<domain>`. The previous implementation learned this from the
 * token-exchange response; without that step the deployment has to be supplied
 * at sign-in.
 */
export const copilotApiBaseUrl = (enterpriseDomain?: string): string =>
	enterpriseDomain
		? `https://copilot-api.${normalizeDomain(enterpriseDomain)}`
		: COPILOT_DEFAULT_API_BASE_URL;

/** Device-flow endpoints for a GitHub deployment. */
export const githubDeviceCodeUrl = (domain = GITHUB_DEFAULT_DOMAIN): string =>
	`https://${normalizeDomain(domain)}/login/device/code`;

export const githubAccessTokenUrl = (domain = GITHUB_DEFAULT_DOMAIN): string =>
	`https://${normalizeDomain(domain)}/login/oauth/access_token`;

/**
 * REST API root. github.com serves it from a separate host; GitHub Enterprise
 * Server serves it from `/api/v3` on the same host.
 */
export const githubUserUrl = (domain = GITHUB_DEFAULT_DOMAIN): string =>
	normalizeDomain(domain) === GITHUB_DEFAULT_DOMAIN
		? "https://api.github.com/user"
		: `https://${normalizeDomain(domain)}/api/v3/user`;

/**
 * Sent with the device-flow request. GitHub Apps derive permissions from their
 * registration rather than from OAuth scopes, so this is vestigial for an
 * `Ov23li…` client id — kept because the endpoint still accepts it and an
 * `Iv1.…` OAuth App would need it.
 */
export const COPILOT_OAUTH_SCOPE = "read:user";

/**
 * Headers every Copilot request carries.
 *
 * Compare the previous version of this file, which sent `editor-version`,
 * `editor-plugin-version` and `copilot-integration-id: vscode-chat` to pass as
 * an editor. None of that is here, and a test asserts it never comes back.
 */
export const COPILOT_REQUEST_HEADERS: Readonly<Record<string, string>> = {
	"user-agent": COPILOT_USER_AGENT,
	"x-github-api-version": COPILOT_API_VERSION,
	"openai-intent": "conversation-edits",
};

/**
 * Header names that would misrepresent this client as an editor. Enumerated so
 * the guard test has something concrete to assert against, and so re-adding one
 * is a visible change to this list.
 */
export const IMPERSONATION_HEADERS: readonly string[] = [
	"editor-version",
	"editor-plugin-version",
	"copilot-integration-id",
];

/**
 * Classifies a request for Copilot's quota accounting: `user` for something a
 * person just typed, `agent` for autonomous follow-up work.
 *
 * Always `agent` here. Every request this extension makes originates from a
 * tool-calling loop, and over-reporting as `user` would misrepresent the
 * traffic in our own favour.
 */
export const COPILOT_INITIATOR = "agent";

/**
 * Give up on device-flow polling after this long. GitHub's own `expires_in` is
 * ~15 minutes; this is a backstop so a forgotten sign-in doesn't poll forever
 * in a service worker.
 */
export const COPILOT_DEVICE_FLOW_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * How long an entitlement lookup stays good. A subscription changing plan is
 * rare; re-asking on every settings render is not worth the round trip.
 */
export const COPILOT_MODELS_TTL_MS = 10 * 60 * 1000;
