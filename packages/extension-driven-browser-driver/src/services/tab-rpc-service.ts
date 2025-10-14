import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	DeferData,
	DeferMessage,
	ResolveData,
	ResolveMessage,
} from "@mcp-browser-kit/core-utils";
import {
	EmitteryMessageChannel,
	MessageChannelRpcClient,
} from "@mcp-browser-kit/core-utils";
import type { Func } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import browser from "webextension-polyfill";
import type { TabTools } from "./tab-tools";

type DeferMessageWithTabId = DeferMessage & {
	extraArgs?: {
		tabId: string;
	};
};

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

		const outgoingUnsubscribe = this._messageChannel.outgoing.on(
			"defer",
			this.handleOutgoingMessage,
		);

		this._rpcChannelUnlink = this.tabRpcClient.bindChannel(
			this._messageChannel,
		);

		this._unlink = this.createCleanupFunction(outgoingUnsubscribe);

		return this._unlink;
	};

	private handleOutgoingMessage = async (message: DeferMessage) => {
		const deferMessage = message as DeferMessageWithTabId;
		const tabId = deferMessage.extraArgs?.tabId;

		if (!tabId) {
			this.logger.warn("Message missing tabId, skipping:", message.id);
			return;
		}

		try {
			this.logger.verbose("Sending message to tab:", tabId, deferMessage);
			const response = await browser.tabs.sendMessage(+tabId, deferMessage);
			this.handleTabMessage(response as ResolveMessage);
		} catch (error) {
			this.logger.error(`Failed to send message to tab ${tabId}:`, error);
		}
	};

	private createCleanupFunction = (outgoingUnsubscribe: Func): Func => {
		return () => {
			outgoingUnsubscribe();
			this._rpcChannelUnlink?.();
		};
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
