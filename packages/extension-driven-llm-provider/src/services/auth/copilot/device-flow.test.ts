import { describe, expect, it, vi } from "vitest";
import {
	accessTokenErrorResponse,
	accessTokenResponse,
	deviceCodeResponse,
	jsonResponse,
	partialDeviceCodeResponse,
} from "../../../testing/github-wire-fixtures";
import { strictFetch } from "../../../testing/strict-fetch";
import {
	type DeviceCodeGrant,
	DeviceFlowError,
	pollForAccessToken,
	requestDeviceCode,
} from "./device-flow";

const grant = (overrides: Partial<DeviceCodeGrant> = {}): DeviceCodeGrant => ({
	userCode: "ABCD-1234",
	verificationUri: "https://github.com/login/device",
	deviceCode: "device-code",
	intervalSeconds: 5,
	expiresInSeconds: 900,
	...overrides,
});

/**
 * Serves the given payloads in order, as `fetch` would — including the browser's
 * receiver rule, so a refactor that starts calling this as `this.fetchImpl(...)`
 * fails here rather than in a browser.
 */
const respondingWith = (payloads: Record<string, unknown>[]) =>
	vi.fn(strictFetch(() => jsonResponse(payloads.shift() ?? {})));

/** Polling without the waiting. Records what the flow *would* have slept. */
const recordingSleep = () => {
	const waits: number[] = [];
	return {
		waits,
		sleepImpl: async (ms: number) => {
			waits.push(ms);
		},
	};
};

describe("requestDeviceCode", () => {
	it("returns the code, the verification page and GitHub's cadence", async () => {
		const fetchImpl = respondingWith([
			deviceCodeResponse({
				intervalSeconds: 7,
				expiresInSeconds: 600,
			}),
		]);

		expect(
			await requestDeviceCode({
				fetchImpl: fetchImpl as unknown as typeof fetch,
			}),
		).toEqual({
			userCode: "ABCD-1234",
			verificationUri: "https://github.com/login/device",
			deviceCode: "dc",
			intervalSeconds: 7,
			expiresInSeconds: 600,
		});
	});

	it("defaults the cadence when GitHub omits it", async () => {
		const fetchImpl = respondingWith([
			deviceCodeResponse(),
		]);

		const result = await requestDeviceCode({
			fetchImpl: fetchImpl as unknown as typeof fetch,
		});
		expect(result.intervalSeconds).toBe(5);
		expect(result.expiresInSeconds).toBe(900);
	});

	it("fails loudly on an incomplete response rather than polling forever", async () => {
		const fetchImpl = respondingWith([
			partialDeviceCodeResponse(),
		]);

		await expect(
			requestDeviceCode({
				fetchImpl: fetchImpl as unknown as typeof fetch,
			}),
		).rejects.toThrow(/incomplete device-code response/);
	});

	it("surfaces a non-200", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({}, 503));
		await expect(
			requestDeviceCode({
				fetchImpl: fetchImpl as unknown as typeof fetch,
			}),
		).rejects.toThrow(/\(503\)/);
	});
});

describe("pollForAccessToken", () => {
	it("keeps polling through authorization_pending and returns the token", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("authorization_pending"),
			accessTokenErrorResponse("authorization_pending"),
			accessTokenResponse("gho_success"),
		]);
		const { sleepImpl, waits } = recordingSleep();

		const token = await pollForAccessToken(grant(), {
			fetchImpl: fetchImpl as unknown as typeof fetch,
			sleepImpl,
		});

		expect(token).toBe("gho_success");
		expect(waits).toEqual([
			5000,
			5000,
			5000,
		]);
	});

	it("backs off to the interval GitHub supplies on slow_down", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("slow_down", 12),
			accessTokenResponse("gho_success"),
		]);
		const { sleepImpl, waits } = recordingSleep();

		await pollForAccessToken(grant(), {
			fetchImpl: fetchImpl as unknown as typeof fetch,
			sleepImpl,
		});

		// First wait used the original interval; the second honoured the back-off.
		expect(waits).toEqual([
			5000,
			12000,
		]);
	});

	it("backs off by 5s when slow_down carries no new interval", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("slow_down"),
			accessTokenResponse("gho_success"),
		]);
		const { sleepImpl, waits } = recordingSleep();

		await pollForAccessToken(grant(), {
			fetchImpl: fetchImpl as unknown as typeof fetch,
			sleepImpl,
		});

		expect(waits).toEqual([
			5000,
			10000,
		]);
	});

	it("classifies an expired code", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("expired_token"),
		]);
		const { sleepImpl } = recordingSleep();

		await expect(
			pollForAccessToken(grant(), {
				fetchImpl: fetchImpl as unknown as typeof fetch,
				sleepImpl,
			}),
		).rejects.toMatchObject({
			failure: "expired",
		});
	});

	it("classifies a declined authorization", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("access_denied"),
		]);
		const { sleepImpl } = recordingSleep();

		await expect(
			pollForAccessToken(grant(), {
				fetchImpl: fetchImpl as unknown as typeof fetch,
				sleepImpl,
			}),
		).rejects.toMatchObject({
			failure: "denied",
		});
	});

	it("stops at its own deadline even if GitHub never says expired", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse(accessTokenErrorResponse("authorization_pending")),
		);
		let clock = 0;

		await expect(
			pollForAccessToken(grant(), {
				fetchImpl: fetchImpl as unknown as typeof fetch,
				sleepImpl: async (ms) => {
					clock += ms;
				},
				now: () => clock,
			}),
		).rejects.toMatchObject({
			failure: "timeout",
		});
	});

	it("cancels when the caller aborts", async () => {
		const controller = new AbortController();
		controller.abort();
		const fetchImpl = vi.fn();

		await expect(
			pollForAccessToken(grant(), {
				fetchImpl: fetchImpl as unknown as typeof fetch,
				signal: controller.signal,
			}),
		).rejects.toBeInstanceOf(DeviceFlowError);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("surfaces an unrecognised error instead of looping", async () => {
		const fetchImpl = respondingWith([
			accessTokenErrorResponse("unsupported_grant_type"),
		]);
		const { sleepImpl } = recordingSleep();

		await expect(
			pollForAccessToken(grant(), {
				fetchImpl: fetchImpl as unknown as typeof fetch,
				sleepImpl,
			}),
		).rejects.toThrow(/unsupported_grant_type/);
	});
});
