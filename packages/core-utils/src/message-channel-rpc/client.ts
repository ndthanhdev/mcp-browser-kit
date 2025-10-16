import type {
	ExtractProcedures,
	ExtractRpcArgs,
	ExtractRpcReturnType,
	RpcClient,
} from "@mcp-browser-kit/types";
import type { Paths } from "type-fest";
import { createPrefixId } from "../create-prefix-id/create-prefix-id";
import { toCompositeKey } from "../to-composite-key/to-composite-key";
import type {
	MessageChannelForRpcClient as MessageChannelRpcClientType,
	ResolveMessage,
} from "./types/message-channel-rpc";

const rpcClientId = createPrefixId("rpcClient");

const RpcCallKey = toCompositeKey<{
	clientId: string;
	method: string;
	index: number;
}>([
	"clientId",
	"method",
	"index",
]);

export class MessageChannelRpcClient<
	T extends {},
	ExtraArgs = object,
	U extends ExtractProcedures<T> = ExtractProcedures<T>,
> implements RpcClient<T, ExtraArgs, U>
{
	private readonly clientId: string;
	private index = 0;
	private pending: Map<string, PromiseWithResolvers<unknown>> = new Map();

	constructor() {
		this.clientId = rpcClientId.generate();
	}

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
		this.index++;
		const key = RpcCallKey.from({
			clientId: this.clientId,
			method,
			index: this.index,
		});
		return key.toString();
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
