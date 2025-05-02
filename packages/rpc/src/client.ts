import type { Func } from "@mcp-browser-kit/types";
import Emittery from "emittery";
import type { ConditionalPickDeep, Merge, Paths } from "type-fest";
import type { MessageChannel } from "./types/message-channel";

import type { GetProcedure, ProcedureMap } from "./server";

export type ToProcedureMap<T> = T extends object
	? ConditionalPickDeep<T, Func>
	: never;

export interface DeferMessage {
	procedure: string;
	args: unknown[];
	id: string;
}

export interface ResolveMessage {
	id: string;
	isOk: boolean;
	result: unknown;
}

export type DeferArgs<
	T extends object,
	U extends Paths<T>,
	ExtraArgs = object,
> = Merge<
	ExtraArgs,
	{
		method: U;
		args: Parameters<GetProcedure<T, U>>;
	}
>;

export class RpcClient<
	T extends {},
	ExtraArgs = object,
	U extends ProcedureMap<T> = ProcedureMap<T>,
> {
	private id = 0;
	private pending: Map<string, PromiseWithResolvers<unknown>> = new Map();
	public readonly emitter: Emittery<{
		defer: DeferMessage;
		resolve: ResolveMessage;
	}> = new Emittery();

	constructor() {
		this.emitter.on("resolve", (message) => {
			const { id, isOk, result } = message;
			const defer = this.pending.get(id);

			if (defer) {
				if (isOk) {
					defer.resolve(result);
				} else {
					defer.reject(result);
				}
			}
		});
	}

	private createId = (): string => {
		this.id += 1;
		return String(this.id);
	};

	public defer = <K extends Paths<U>>({
		method,
		args,
		...extraArgs
	}: DeferArgs<U, K, ExtraArgs>): Promise<
		Awaited<ReturnType<GetProcedure<U, K>>>
	> => {
		const id = this.createId();
		const defer =
			Promise.withResolvers<Awaited<ReturnType<GetProcedure<U, K>>>>();

		defer.promise.finally(() => {
			this.pending.delete(id);
		});
		this.pending.set(id, defer as PromiseWithResolvers<unknown>);

		this.emitter.emit("defer", {
			...extraArgs,
			procedure: String(method),
			args,
			id,
		});

		return defer.promise;
	};

	public onDefer = <K extends DeferMessage>(
		callback: (message: K) => void,
	): (() => void) => {
		return this.emitter.on(
			"defer",
			callback as (message: DeferMessage) => void,
		);
	};

	public startListen = (messageChannel: MessageChannel) => {
		const unsubscribe = messageChannel.subscribe((message: unknown) => {
			const msg = message as ResolveMessage;

			this.emitter.emit("resolve", msg);
		});

		return unsubscribe;
	}
}
