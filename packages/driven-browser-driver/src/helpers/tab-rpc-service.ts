import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import type { Func } from "@mcp-browser-kit/types";
import type {
	DeferData,
	DeferMessage,
	ResolveData,
	ResolveMessage,
} from "@mcp-browser-kit/utils";
import {
	EmitteryMessageChannel,
	MessageChannelRpcClient,
} from "@mcp-browser-kit/utils";
import { inject, injectable } from "inversify";
import browser from "webextension-polyfill";
import type { TabTools } from "./tab-tools";

@injectable()
export class TabRpcService {
	private readonly logger;
	public readonly tabRpcClient = new MessageChannelRpcClient<
		TabTools,
		{
			tabId: string;
		}
	>();
	private _unlink: Func | undefined;
	private _rpcChannelUnlink: Func | undefined;
	private _messageChannel = new EmitteryMessageChannel<
		ResolveData,
		DeferData
	>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("TabRpcService");
	}

	// RPC Communication Methods
	linkRpc = () => {
		this.unlinkRpc();

		// Handle outgoing messages by sending them via browser.tabs.sendMessage
		const outgoingUnsubscribe = this._messageChannel.outgoing.on(
			"defer",
			async (message: DeferMessage) => {
				const deferMessage = message as DeferMessage & {
					extraArgs?: {
						tabId: string;
					};
				};
				if (deferMessage.extraArgs?.tabId) {
					try {
						const response = await browser.tabs.sendMessage(
							+deferMessage.extraArgs.tabId,
							deferMessage,
						);
						this.handleTabMessage(response as ResolveMessage);
					} catch (error) {
						this.logger.error("Failed to send message to tab:", error);
					}
				}
			},
		);

		// Bind the channel to the rpcClient
		this._rpcChannelUnlink = this.tabRpcClient.bindChannel(
			this._messageChannel,
		);

		// Store the cleanup function
		this._unlink = () => {
			outgoingUnsubscribe();
			this._rpcChannelUnlink?.();
		};

		return this._unlink;
	};

	unlinkRpc = () => {
		// browser.runtime.onMessage.removeListener(this.handleTabMessage);
		this._unlink?.();
	};

	handleTabMessage = (message: unknown) => {
		if (typeof message === "object" && message !== null && "id" in message) {
			this._messageChannel.incoming.emit("resolve", message as ResolveMessage);
			this.logger.verbose(
				"Handled tab message:",
				(message as ResolveMessage).id,
			);
		}
	};
}
