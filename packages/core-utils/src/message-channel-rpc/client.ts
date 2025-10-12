import type {
	ExtractProcedures,
	ExtractRpcArgs,
	ExtractRpcReturnType,
	RpcClient,
} from "@mcp-browser-kit/types";
import type { Paths } from "type-fest";
import type {
	MessageChannelForRpcClient as MessageChannelRpcClientType,
	ResolveMessage,
} from "./types/message-channel-rpc";

export class MessageChannelRpcClient<
	T extends {},
	ExtraArgs = object,
	U extends ExtractProcedures<T> = ExtractProcedures<T>,
> implements RpcClient<T, ExtraArgs, U>
{
	private id = 0;
	private pending: Map<string, PromiseWithResolvers<unknown>> = new Map();

	private messageChannel?: MessageChannelRpcClientType;
	private messageChannelUnsubscribe?: () => void;

	public bindChannel = (messageChannel: MessageChannelRpcClientType) => {
		this.messageChannel = messageChannel;
		this.messageChannelUnsubscribe = this.messageChannel.incoming.on(
			"resolve",
			(message: ResolveMessage) => {
				const { id, isOk, result } = message;
				const defer = this.pending.get(id);

				if (defer) {
					if (isOk) {
						defer.resolve(result);
					} else {
						defer.reject(result);
					}
				}
			},
		);
		return this.messageChannelUnsubscribe;
	};

	private createId = (method: string): string => {
		this.id++;
		const id = this.id;
		return `${id}_${method}`;
	};

	public call = <K extends Paths<U>>({
		method,
		args,
		extraArgs,
	}: ExtractRpcArgs<U, K, ExtraArgs>): ExtractRpcReturnType<U, K> => {
		if (!this.messageChannel) {
			throw new Error("MessageChannel not initialized. Call listen() first.");
		}

		const id = this.createId(String(method));
		const defer = Promise.withResolvers<Awaited<ExtractRpcReturnType<U, K>>>();

		defer.promise.finally(() => {
			this.pending.delete(id);
		});
		this.pending.set(id, defer as PromiseWithResolvers<unknown>);

		this.messageChannel.outgoing.emit("defer", {
			extraArgs,
			procedure: String(method),
			args,
			id,
		});

		return defer.promise;
	};

	public unbindChannel = (): void => {
		if (this.messageChannelUnsubscribe) {
			this.messageChannelUnsubscribe();
			this.messageChannelUnsubscribe = undefined;
		}
	};
}
