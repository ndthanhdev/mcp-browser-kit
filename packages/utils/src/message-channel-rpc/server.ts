import type { ExtractProcedures, Func } from "@mcp-browser-kit/types";
import * as R from "ramda";
import type {
	DeferMessage,
	MessageChannelForRpcServer as MessageChannelRpcServerType,
	ResolveMessage,
} from "./types/message-channel-rpc";

export class MessageChannelRpcServer<
	T extends {},
	U extends ExtractProcedures<T> = ExtractProcedures<T>,
> {
	private procedures: U;
	private unsubscribe?: () => void;

	constructor(procedures: U) {
		this.procedures = procedures;
	}

	startListen = (channel: MessageChannelRpcServerType) => {
		// Stop any existing listener first
		this.stopListen();

		this.unsubscribe = channel.incoming.on("defer", (message: DeferMessage) => {
			this.handleDefer(message).then((result) => {
				channel.outgoing.emit("resolve", result);
			});
		});

		return this.unsubscribe;
	};

	stopListen = () => {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = undefined;
		}
	};

	async handleDefer(message: DeferMessage): Promise<ResolveMessage> {
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
	}
}

export type InferProcedureMap<T> = T extends MessageChannelRpcServer<infer U>
	? ExtractProcedures<U>
	: never;



