import { describe, expect, it, vi } from "vitest";
import { strictFetch } from "../../../testing/strict-fetch";
import {
	COPILOT_CLIENT_ID,
	COPILOT_REQUEST_HEADERS,
	copilotApiBaseUrl,
	githubAccessTokenUrl,
	githubDeviceCodeUrl,
	githubUserUrl,
	hasCopilotClientId,
	IMPERSONATION_HEADERS,
	normalizeDomain,
} from "./constants";
import { CopilotDeviceFlowAuth } from "./copilot-device-flow-auth";
import { fetchCopilotModels } from "./copilot-models";
import { fetchGithubLogin, requestDeviceCode } from "./device-flow";

/**
 * This adapter used to authenticate by pretending to be VS Code: it sent
 * `editor-version`, `editor-plugin-version` and `copilot-integration-id`, and
 * signed in with an editor's client id. That is the whole reason the provider
 * was gated off behind a feature flag.
 *
 * Removing the code is easy to undo by accident — a merge, or a well-meaning
 * "Copilot returns 403, let me add the header the old code had". These tests
 * make the absence of impersonation an asserted property rather than a fact
 * about the current diff.
 */
describe("Copilot requests do not impersonate an editor", () => {
	const headersOf = (call: unknown[]): Headers =>
		new Headers((call[1] as RequestInit | undefined)?.headers);

	it("sends no editor headers when listing models", async () => {
		const impl = vi.fn(() =>
			Response.json({
				data: [],
			}),
		);

		await fetchCopilotModels("gho_x", {
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		const headers = headersOf(impl.mock.calls[0] as unknown[]);
		for (const name of IMPERSONATION_HEADERS) {
			expect(headers.has(name)).toBe(false);
		}
	});

	it("sends no editor headers during the device flow", async () => {
		const impl = vi.fn(() =>
			Response.json({
				// biome-ignore lint/style/useNamingConvention: GitHub wire format.
				device_code: "d",
				// biome-ignore lint/style/useNamingConvention: GitHub wire format.
				user_code: "U-1",
				// biome-ignore lint/style/useNamingConvention: GitHub wire format.
				verification_uri: "https://github.com/login/device",
			}),
		);

		await requestDeviceCode({
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		const headers = headersOf(impl.mock.calls[0] as unknown[]);
		for (const name of IMPERSONATION_HEADERS) {
			expect(headers.has(name)).toBe(false);
		}
	});

	it("identifies itself honestly rather than as an editor", () => {
		const userAgent = COPILOT_REQUEST_HEADERS["user-agent"];

		expect(userAgent).toContain("mcp-browser-kit");
		// The value this replaced.
		expect(userAgent).not.toContain("GitHubCopilotChat");
		expect(userAgent).not.toContain("vscode");
	});

	it("pins an API version so a breaking change is explicit", () => {
		expect(COPILOT_REQUEST_HEADERS["x-github-api-version"]).toMatch(
			/^\d{4}-\d{2}-\d{2}$/,
		);
	});

	it("does not ship an editor's client id", () => {
		// VS Code's, which the previous implementation used.
		expect(COPILOT_CLIENT_ID).not.toBe("Iv1.b507a08c87ecfe98");
		// OpenCode's, which this approach was modelled on but must not borrow.
		expect(COPILOT_CLIENT_ID).not.toBe("Ov23li8tweQw6odWQebz");
	});
});

describe("availability is separate from being signed in", () => {
	it("reports unavailable while no client id is configured", () => {
		expect(hasCopilotClientId("")).toBe(false);
		expect(hasCopilotClientId("Ov23liSomething")).toBe(true);
	});

	it("ships a client id, so Copilot is offered", () => {
		// The guard below only means something while an id is present; asserting
		// it here stops the availability tests silently becoming no-ops if the id
		// is ever cleared.
		expect(hasCopilotClientId()).toBe(true);
	});

	it("ships a client id in a shape GitHub issues", () => {
		// GitHub Apps are `Iv23li…` or `Ov23li…`; OAuth Apps are `Iv1.…`. A
		// truncated or placeholder value fails the device flow at runtime with a
		// message that does not mention this constant.
		expect(COPILOT_CLIENT_ID).toMatch(
			/^(Iv23li|Ov23li)[A-Za-z0-9]{12,}$|^Iv1\.[a-f0-9]{16,}$/,
		);
	});

	it("refuses to start a sign-in that GitHub would reject", async () => {
		// Guards against showing the user a device code from a request that never
		// had a chance of succeeding. Exercised by disabling the id for one call,
		// since the shipped build has one.
		await expect(new CopilotDeviceFlowAuth("").beginSignIn()).rejects.toThrow(
			/no GitHub client id/,
		);
	});
});

describe("deployment routing", () => {
	it("uses the public hosts for github.com", () => {
		expect(copilotApiBaseUrl()).toBe("https://api.githubcopilot.com");
		expect(githubDeviceCodeUrl()).toBe("https://github.com/login/device/code");
		expect(githubUserUrl()).toBe("https://api.github.com/user");
	});

	it("routes an enterprise deployment to its own hosts", () => {
		expect(copilotApiBaseUrl("acme.ghe.com")).toBe(
			"https://copilot-api.acme.ghe.com",
		);
		expect(githubDeviceCodeUrl("acme.ghe.com")).toBe(
			"https://acme.ghe.com/login/device/code",
		);
		expect(githubAccessTokenUrl("acme.ghe.com")).toBe(
			"https://acme.ghe.com/login/oauth/access_token",
		);
	});

	it("serves the enterprise REST API from /api/v3, not api.github.com", () => {
		// GitHub Enterprise Server has no separate api. host; getting this wrong
		// sends an enterprise token to the public API.
		expect(githubUserUrl("acme.ghe.com")).toBe(
			"https://acme.ghe.com/api/v3/user",
		);
	});

	it("accepts a domain however the user pasted it", () => {
		for (const input of [
			"https://acme.ghe.com",
			"http://acme.ghe.com",
			"acme.ghe.com/",
			"https://acme.ghe.com//",
		]) {
			expect(normalizeDomain(input)).toBe("acme.ghe.com");
		}
	});

	it("targets the enterprise host when looking up the account", async () => {
		const impl = vi.fn(() =>
			Response.json({
				login: "octocat",
			}),
		);

		await fetchGithubLogin("gho_x", {
			domain: "acme.ghe.com",
			fetchImpl: vi.fn(strictFetch(impl)),
		});

		expect((impl.mock.calls[0] as unknown[])[0]).toBe(
			"https://acme.ghe.com/api/v3/user",
		);
	});
});
