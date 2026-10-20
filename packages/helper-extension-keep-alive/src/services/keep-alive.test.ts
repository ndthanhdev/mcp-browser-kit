import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetRuntimeStub,
	sentMessages,
} from "../testing/webextension-polyfill-stub";
import { KeepAlive } from "./keep-alive";

/** Captures what was logged, so noise is assertable. */
const recordingLoggerFactory = () => {
	const calls: Array<{
		level: string;
		message: string;
	}> = [];
	const record = (level: string) => (message: unknown) => {
		calls.push({
			level,
			message: String(message),
		});
	};
	return {
		calls,
		factory: {
			create: () => ({
				info: record("info"),
				warn: record("warn"),
				error: record("error"),
				debug: record("debug"),
				verbose: record("verbose"),
			}),
		} as unknown as LoggerFactoryOutputPort,
	};
};

/** Rejections that escaped to the process. */
const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => {
	unhandled.push(reason);
};

beforeEach(() => {
	resetRuntimeStub();
	unhandled.length = 0;
	process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
	process.off("unhandledRejection", onUnhandled);
});

/** A cadence short enough to watch several ticks without a slow test. */
const TICK_MS = 40;

/**
 * Drain pending tasks without reaching an interval tick. Real timers: Node only
 * reports an unhandled rejection on a real macrotask boundary.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 1));

/** Wait for roughly `ticks` interval firings, landing between ticks. */
const settle = (ticks = 1) =>
	new Promise((resolve) => setTimeout(resolve, TICK_MS * ticks + TICK_MS / 2));

describe("sending with a listener present", () => {
	it("pings immediately and then on an interval", async () => {
		const { factory } = recordingLoggerFactory();
		const listener = new KeepAlive(factory);
		listener.startListening();

		const stop = new KeepAlive(factory).startSending(TICK_MS);
		await flush();
		expect(sentMessages).toHaveLength(1);

		await settle(1);
		expect(sentMessages.length).toBeGreaterThan(1);

		stop();
		const afterStop = sentMessages.length;
		await settle(2);
		expect(sentMessages).toHaveLength(afterStop);
	});

	it("logs nothing alarming on the happy path", async () => {
		const { calls, factory } = recordingLoggerFactory();
		new KeepAlive(factory).startListening();

		new KeepAlive(factory).startSending(TICK_MS);
		await flush();

		expect(calls.filter((call) => call.level === "warn")).toEqual([]);
		expect(calls.filter((call) => call.level === "error")).toEqual([]);
	});
});

describe("sending when the background never registered a listener", () => {
	it("does not raise an unhandled rejection", async () => {
		const { factory } = recordingLoggerFactory();

		new KeepAlive(factory).startSending(TICK_MS);
		await flush();

		expect(unhandled).toEqual([]);
	});

	it("still does not raise one on later ticks", async () => {
		const { factory } = recordingLoggerFactory();

		new KeepAlive(factory).startSending(TICK_MS);
		await settle(3);

		expect(sentMessages.length).toBeGreaterThan(1);
		expect(unhandled).toEqual([]);
	});

	it("reports the failure once, not on every tick", async () => {
		const { calls, factory } = recordingLoggerFactory();

		new KeepAlive(factory).startSending(TICK_MS);
		await settle(5);

		const warnings = calls.filter((call) => call.level === "warn");
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toMatch(/Receiving end does not exist/);
	});

	it("keeps trying despite the failure", async () => {
		const { factory } = recordingLoggerFactory();

		new KeepAlive(factory).startSending(TICK_MS);
		await settle(3);

		expect(sentMessages.length).toBeGreaterThanOrEqual(3);
	});

	it("announces recovery once the listener appears", async () => {
		const { calls, factory } = recordingLoggerFactory();
		const sender = new KeepAlive(factory);

		sender.startSending(TICK_MS);
		await flush();

		new KeepAlive(factory).startListening();
		await settle(2);

		expect(
			calls.some((call) => call.message.includes("Keep-alive recovered")),
		).toBe(true);
	});
});

describe("listening", () => {
	it("acknowledges a keep-alive message", async () => {
		const { factory } = recordingLoggerFactory();
		new KeepAlive(factory).startListening();

		const browser = (await import("../testing/webextension-polyfill-stub"))
			.default;
		expect(
			await browser.runtime.sendMessage({
				action: "keepAlive",
			}),
		).toEqual({
			action: "keepAliveAck",
		});
	});

	it("ignores unrelated messages", async () => {
		const { factory } = recordingLoggerFactory();
		new KeepAlive(factory).startListening();

		const browser = (await import("../testing/webextension-polyfill-stub"))
			.default;
		expect(
			await browser.runtime.sendMessage({
				action: "somethingElse",
			}),
		).toBeUndefined();
	});

	it("stops acknowledging after the returned stop function runs", async () => {
		const { factory } = recordingLoggerFactory();
		const stop = new KeepAlive(factory).startListening();
		stop();

		const browser = (await import("../testing/webextension-polyfill-stub"))
			.default;
		await expect(
			browser.runtime.sendMessage({
				action: "keepAlive",
			}),
		).rejects.toThrow(/Receiving end does not exist/);
	});
});
