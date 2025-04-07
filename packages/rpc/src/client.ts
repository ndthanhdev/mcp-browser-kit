import type { Func } from "@mcp-browser-kit/types";
import Emittery from "emittery";
import type { ConditionalPick } from "type-fest";

import type { ProcedureMap } from "./server";

export type ToProcedureMap<T> = T extends object
	? ConditionalPick<T, Func>
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

export class RpcClient<
	T extends {},
	U extends ProcedureMap = ToProcedureMap<T>,
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

	public defer = <K extends keyof U>(
		method: K,
		...args: Parameters<U[K]>
	): Promise<Awaited<ReturnType<U[K]>>> => {
		const id = this.createId();
		const defer = Promise.withResolvers<Awaited<ReturnType<U[K]>>>();

		defer.promise.finally(() => {
			this.pending.delete(id);
		});
		this.pending.set(id, defer as PromiseWithResolvers<unknown>);

		this.emitter.emit("defer", {
			procedure: String(method),
			args,
			id,
		});

		return defer.promise;
	};

	public onDefer = (
		callback: (message: DeferMessage) => void,
	): (() => void) => {
		return this.emitter.on("defer", callback);
	};
}
