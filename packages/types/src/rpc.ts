import type {
	ConditionalPickDeep,
	Get,
	IsStringLiteral,
	Paths,
} from "type-fest";
import type { Func } from "./func";

export type ExtractService<T extends {}> = ConditionalPickDeep<T, Func>;

export type ExtractMethod<
	T extends {},
	K extends Paths<T>
> = IsStringLiteral<K> extends true
	? Get<T, Extract<K, string>> extends Func
		? Get<T, Extract<K, string>>
		: never
	: never;

export type ExtractMethodArgs<
	T extends object,
	U extends Paths<T>,
	ExtraArgs = object
> = {
	method: U;
	args: Parameters<ExtractMethod<T, U>>;
	extraArgs: ExtraArgs;
};

export type RpcClient<
	T extends {},
	ExtraArgs = object,
	U extends ExtractService<T> = ExtractService<T>
> = {
	[K in Paths<U>]: (
		args: ExtractMethodArgs<U, K, ExtraArgs>
	) => Promise<Awaited<ReturnType<ExtractMethod<U, K>>>>;
};
