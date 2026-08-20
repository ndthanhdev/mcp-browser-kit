import { describe, expect, it, vi } from "vitest";
import {
	copilotTokenResponse,
	jsonResponse,
} from "../../../testing/github-wire-fixtures";
import { CopilotEntitlementError, CopilotTokenCache } from "./copilot-token";

/** A 30-minute token, as the exchange normally returns. */
const validToken = (apiBaseUrl?: string) =>
	jsonResponse(
		copilotTokenResponse({
			expiresAtSeconds: 1800,
			apiBaseUrl,
		}),
	);

/** A clock the test advances by hand, so expiry is deterministic. */
const manualClock = (start = 0) => {
	let value = start;
	return {
		now: () => value,
		advance: (ms: number) => {
			value += ms;
		},
	};
};

describe("CopilotTokenCache", () => {
	it("exchanges the OAuth token for a bearer and its base URL", async () => {
		const fetchImpl = vi.fn(async () =>
			validToken("https://api.enterprise.githubcopilot.com"),
		);

		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		expect(await cache.get()).toEqual({
			token: "t",
			// `expires_at` is epoch *seconds* on the wire.
			expiresAt: 1_800_000,
			apiBaseUrl: "https://api.enterprise.githubcopilot.com",
		});
	});

	it("falls back to the public host when the response omits endpoints", async () => {
		const fetchImpl = vi.fn(async () => validToken());
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		expect((await cache.get()).apiBaseUrl).toBe(
			"https://api.githubcopilot.com",
		);
	});

	it("assumes a 30 minute lifetime when the response omits expires_at", async () => {
		const clock = manualClock(1_000);
		const fetchImpl = vi.fn(async () => jsonResponse(copilotTokenResponse()));
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			clock.now,
		);

		expect((await cache.get()).expiresAt).toBe(1_000 + 30 * 60 * 1000);
	});

	it("reuses the cached bearer instead of re-exchanging", async () => {
		const fetchImpl = vi.fn(async () => validToken());
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		await cache.get();
		await cache.get();
		await cache.get();

		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("re-mints before expiry, not at it, so a token can't die mid-turn", async () => {
		const clock = manualClock();
		const fetchImpl = vi.fn(async () => validToken());
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			clock.now,
		);

		await cache.get();
		// 1 minute before the stated expiry — inside the 5 minute refresh skew.
		clock.advance(1_740_000);
		await cache.get();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it("collapses concurrent refreshes into one exchange", async () => {
		let release: (value: Response) => void = () => {};
		const pending = new Promise<Response>((resolve) => {
			release = resolve;
		});
		const fetchImpl = vi.fn(() => pending);

		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		const all = Promise.all([
			cache.get(),
			cache.get(),
			cache.get(),
		]);
		release(validToken());
		await all;

		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("retries after a failed exchange rather than caching the failure", async () => {
		const fetchImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error("network down"))
			.mockResolvedValueOnce(validToken());

		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		await expect(cache.get()).rejects.toThrow("network down");
		expect((await cache.get()).token).toBe("t");
	});

	it("tells the user to sign in when there is no OAuth token", async () => {
		const fetchImpl = vi.fn();
		const cache = new CopilotTokenCache(
			async () => undefined,
			fetchImpl as unknown as typeof fetch,
		);

		await expect(cache.get()).rejects.toThrow(
			/Not signed in to GitHub Copilot/,
		);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("distinguishes a missing subscription from a transport failure", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({}, 403));
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
		);

		await expect(cache.get()).rejects.toBeInstanceOf(CopilotEntitlementError);
	});

	it("treats a revoked authorization the same way", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({}, 401));
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
		);

		await expect(cache.get()).rejects.toBeInstanceOf(CopilotEntitlementError);
	});

	it("surfaces other HTTP failures plainly", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
		);

		await expect(cache.get()).rejects.toThrow(/exchange failed \(500\)/);
	});

	it("forgets the bearer on invalidate so sign-out takes effect", async () => {
		const fetchImpl = vi.fn(async () => validToken());
		const cache = new CopilotTokenCache(
			async () => "gho_x",
			fetchImpl as unknown as typeof fetch,
			manualClock().now,
		);

		await cache.get();
		cache.invalidate();
		await cache.get();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
