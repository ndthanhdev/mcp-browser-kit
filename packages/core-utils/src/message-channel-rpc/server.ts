import type { ExtractProcedures, Func } from "@mcp-browser-kit/types";
import type {
	DeferMessage,
	MessageChannelForRpcServer as MessageChannelRpcServerType,
	ResolveMessage,
} from "./types/message-channel-rpc";

/**
 * Controls how concurrently-arriving `defer` messages are dispatched:
 * - "queue": run one at a time, in arrival order (safe against shared
 *   mutable state, e.g. tab context, DOM mutation observers, overlays).
 * - "parallel": run each message as soon as it arrives, with no ordering
 *   guarantees between them.
 */
export type RpcDispatchMode = "queue" | "parallel";

/**
 * Walk a dotted procedure path, e.g. `"tools.click"`.
 *
 * Hand-rolled rather than ramda: this module ships in every content script, and
 * a ramda namespace import can't be tree-shaken.
 */
const resolveProcedure = (
	procedures: unknown,
	procedure: string,
): Func | undefined => {
	let current: unknown = procedures;
	for (const segment of procedure.split(".")) {
		if (current === null || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[segment];
	}
	return typeof current === "function" ? (current as Func) : undefined;
};

export class MessageChannelRpcServer<
	T extends {},
	U extends ExtractProcedures<T> = ExtractProcedures<T>,
> {
	private procedures: U;
	private unsubscribe?: () => void;
	private readonly dispatchMode: RpcDispatchMode;
	// Serializes handleDefer calls per instance when dispatchMode is "queue",
	// so concurrently-arriving messages run one at a time instead of
	// interleaving. handleDefer always resolves (never rejects), so this
	// chain can't get stuck.
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		procedures: U,
		options?: {
			dispatchMode?: RpcDispatchMode;
		},
	) {
		this.procedures = procedures;
		this.dispatchMode = options?.dispatchMode ?? "parallel";
	}

	startListen = (channel: MessageChannelRpcServerType) => {
		// Stop any existing listener first
		this.stopListen();

		this.unsubscribe = channel.incoming.on("defer", (message: DeferMessage) => {
			const run = () =>
				this.handleDefer(message).then((result) => {
					channel.outgoing.emit("resolve", result);
				});

			if (this.dispatchMode === "queue") {
				this.queue = this.queue.then(run);
			} else {
				run();
			}
		});

		return this.unsubscribe;
	};

	stopListen = () => {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = undefined;
		}
	};

	handleDefer = async (message: DeferMessage): Promise<ResolveMessage> => {
		const { procedure, args, id } = message;
		const fn = resolveProcedure(this.procedures, procedure);

		if (!fn) {
			return Promise.resolve({
				id,
				isOk: false,
				result: `Procedure ${procedure} not found`,
			});
		}

		try {
			const result = await fn(...args);
			return Promise.resolve({
				id,
				isOk: true,
				result,
			});
		} catch (error) {
			return Promise.resolve({
				id,
				isOk: false,
				// Error objects don't survive structured cloning across extension
				// messaging (they arrive as {}), so send the message itself.
				result: error instanceof Error ? error.message : error,
			});
		}
	};
}

export type InferProcedureMap<T> =
	T extends MessageChannelRpcServer<infer U> ? ExtractProcedures<U> : never;
