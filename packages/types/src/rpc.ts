import type { ConditionalPickDeep, Get, Paths } from "type-fest";
import type { Func } from "./func";

export type ExtractProcedures<T extends {}> = ConditionalPickDeep<T, Func>;

export type ExtractProcedure<
	T extends {},
	K extends Paths<T>,
> = K extends string ? (Get<T, K> extends Func ? Get<T, K> : never) : never;

export type ExtractRpcArgs<
	T extends object,
	U extends Paths<T>,
	ExtraArgs = object,
> = {
	method: U;
	args: Parameters<ExtractProcedure<T, U>>;
	extraArgs: ExtraArgs;
};

export type ExtractRpcReturnType<
	T extends object,
	U extends Paths<T>,
> = Promise<Awaited<ReturnType<ExtractProcedure<T, U>>>>;

export type RpcClient<
	T extends {},
	ExtraArgs = object,
	U extends ExtractProcedures<T> = ExtractProcedures<T>,
> = {
	call<K extends Paths<U>>(
		args: ExtractRpcArgs<U, K, ExtraArgs>,
	): ExtractRpcReturnType<U, K>;
};
