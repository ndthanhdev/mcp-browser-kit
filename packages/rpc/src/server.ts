import type { Func } from "@mcp-browser-kit/types";
import * as R from "ramda";
import type {
	ConditionalPickDeep,
	Get,
	IsStringLiteral,
	Paths,
} from "type-fest";
import type { DeferMessage, ResolveMessage } from "./client";
import { MessageChannel } from "./types/message-channel";

export type ProcedureMap<T extends {}> = ConditionalPickDeep<T, Func>;

export type GetProcedure<
	T extends {},
	K extends Paths<T>,
> = IsStringLiteral<K> extends true
	? Get<T, Extract<K, string>> extends Func
	? Get<T, Extract<K, string>>
	: never
	: never;

export class RpcServer<
	T extends {},
	U extends ProcedureMap<T> = ProcedureMap<T>,
> {
	private procedures: U;
	private unsubscribe: (() => void) | undefined;

	constructor(procedures: U,
		private readonly messageChannel?: MessageChannel
	) {
		this.procedures = procedures;
	}

	startListen = () => {
		if (!this.messageChannel) {
			throw new Error("Message subscriber is not defined");
		}

		const channel = this.messageChannel;

		this.unsubscribe = channel.subscribe(
			(message: unknown) => {

				const msg = message as DeferMessage;

				this.handleDefer(msg).then((result) => {
					channel.publish(result);
				});
			},
		);

		return this.unsubscribe;
	}

	stopListen = () => {
		if (!this.unsubscribe) {
			throw new Error("Did not start listening");
		}

		this.unsubscribe();
		this.unsubscribe = undefined;
	}

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
			console.log("result", result);

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

export type InferProcedureMap<T> = T extends RpcServer<infer U>
	? ProcedureMap<U>
	: never;
