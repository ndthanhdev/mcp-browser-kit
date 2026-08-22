import Emittery from "emittery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MessageChannelRpcClient } from "./client";
import { MessageChannelRpcServer } from "./server";
import type {
	DeferData,
	MessageChannelForRpcClient,
	MessageChannelForRpcServer,
	ResolveData,
} from "./types/message-channel-rpc";

interface Procedures {
	echo: (value: string) => Promise<string>;
	boom: () => Promise<never>;
	nested: {
		deep: {
			ping: () => Promise<string>;
		};
	};
}

/**
 * A client and server joined by a shared pair of emitters, standing in for a
 * real transport. The client's outgoing is the server's incoming and vice
 * versa.
 */
const connectedPair = (
	options?: ConstructorParameters<
		typeof MessageChannelRpcServer<Procedures>
	>[1],
) => {
	// One emitter per direction, shared by both ends: the client's outgoing IS
	// the server's incoming.
	const clientToServer = new Emittery<DeferData>();
	const serverToClient = new Emittery<ResolveData>();

	const serverChannel = {
		incoming: clientToServer,
		outgoing: serverToClient,
	} as MessageChannelForRpcServer;
	const clientChannel = {
		incoming: serverToClient,
		outgoing: clientToServer,
	} as MessageChannelForRpcClient;

	const server = new MessageChannelRpcServer<Procedures>(
		{
			echo: async (value: string) => value,
			boom: async () => {
				throw new Error("procedure exploded");
			},
			nested: {
				deep: {
					ping: async () => "pong",
				},
			},
			// A dotted path may land on a plain value. `ExtractProcedures` filters
			// non-functions out of the type, so it is added past the type here.
			...({
				plainValue: 42,
			} as object),
		},
		options,
	);
	server.startListen(serverChannel);

	const client = new MessageChannelRpcClient<Procedures>();
	client.bindChannel(clientChannel);

	return {
		client,
		server,
	};
};

/**
 * Issue a call by name. Typed loosely on purpose: one test deliberately invokes
 * a procedure that does not exist, which the typed `call` signature forbids.
 */
const call = (
	client: MessageChannelRpcClient<Procedures>,
	method: string,
	args: unknown[] = [],
): Promise<unknown> =>
	(
		client as unknown as {
			call: (request: {
				method: string;
				args: unknown[];
				extraArgs: object;
			}) => Promise<unknown>;
		}
	).call({
		method,
		args,
		extraArgs: {},
	});

describe("MessageChannelRpcClient", () => {
	it("resolves with the procedure's return value", async () => {
		const { client } = connectedPair();
		await expect(
			call(client, "echo", [
				"hello",
			]),
		).resolves.toBe("hello");
	});

	it("rejects with the error the procedure threw", async () => {
		const { client } = connectedPair();
		await expect(call(client, "boom")).rejects.toThrow("procedure exploded");
	});

	it("resolves a dotted path into nested procedures", async () => {
		const { client } = connectedPair();
		await expect(call(client, "nested.deep.ping")).resolves.toBe("pong");
	});

	it("treats a path that lands on a non-function as not found", async () => {
		const { client } = connectedPair();
		await expect(call(client, "plainValue")).rejects.toBe(
			"Procedure plainValue not found",
		);
	});

	it("treats a path through a non-object as not found", async () => {
		const { client } = connectedPair();
		await expect(call(client, "echo.nope.deeper")).rejects.toBe(
			"Procedure echo.nope.deeper not found",
		);
	});

	it("rejects when the procedure does not exist", async () => {
		const { client } = connectedPair();
		await expect(call(client, "missing")).rejects.toBe(
			"Procedure missing not found",
		);
	});

	describe("unhandled rejections", () => {
		const unhandled: unknown[] = [];
		const record = (reason: unknown) => {
			unhandled.push(reason);
		};

		beforeEach(() => {
			unhandled.length = 0;
			process.on("unhandledRejection", record);
		});

		afterEach(() => {
			process.off("unhandledRejection", record);
		});

		/**
		 * Regression: the pending-map cleanup used `defer.promise.finally(...)`,
		 * which derives a promise that re-raises the rejection. Nothing handled that
		 * derived promise, so every rejected RPC call raised an unhandled rejection
		 * *in addition to* the one the caller sees — noisy in a service worker, and
		 * fatal under `--unhandled-rejections=strict`.
		 */
		it("does not raise a second, unhandled rejection when a call fails", async () => {
			const { client } = connectedPair();

			await expect(call(client, "boom")).rejects.toThrow("procedure exploded");
			// Let the microtask queue drain so any stray rejection is reported.
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(unhandled).toEqual([]);
		});

		it("stays quiet for a rejected call in queue dispatch mode too", async () => {
			const { client } = connectedPair({
				dispatchMode: "queue",
			});

			await expect(call(client, "boom")).rejects.toThrow("procedure exploded");
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(unhandled).toEqual([]);
		});
	});

	it("still forgets the pending call after it settles", async () => {
		const { client } = connectedPair();

		await expect(call(client, "boom")).rejects.toThrow();
		await expect(
			call(client, "echo", [
				"after",
			]),
		).resolves.toBe("after");

		// `pending` is private; an accumulating map is the observable symptom.
		expect(
			(
				client as unknown as {
					pending: Map<string, unknown>;
				}
			).pending.size,
		).toBe(0);
	});
});
