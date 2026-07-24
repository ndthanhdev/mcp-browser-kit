import type { ExtractProcedures, Func } from "@mcp-browser-kit/types";
import * as R from "ramda";
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
		const fn = R.pathOr(undefined, procedure.split("."), this.procedures) as
			| Func
			| undefined;

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
				result: error,
			});
		}
	};
}

export type InferProcedureMap<T> =
	T extends MessageChannelRpcServer<infer U> ? ExtractProcedures<U> : never;
