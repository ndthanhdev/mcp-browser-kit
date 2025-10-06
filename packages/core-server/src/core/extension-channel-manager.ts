import type { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import { MessageChannelRpcClient } from "@mcp-browser-kit/utils";
import { inject, injectable } from "inversify";
import { LoggerFactoryOutputPort } from "../output-ports";
import {
	type ChannelInfo,
	ExtensionChannelProviderOutputPort,
} from "../output-ports/extension-channel-provider";

@injectable()
export class ExtensionChannelManager {
	private readonly logger;
	private readonly channels = new Map<string, ChannelInfo>();
	private readonly rpcClients = new Map<
		string,
		MessageChannelRpcClient<ExtensionToolCallInputPort>
	>();
	private readonly browserIdToChannelId = new Map<string, string>();
	private isListening = false;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(ExtensionChannelProviderOutputPort)
		private readonly extensionChannelProvider: ExtensionChannelProviderOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionChannelManager");
		this.startListening();
	}

	private startListening = (): void => {
		if (this.isListening) {
			this.logger.warn("Already listening for extension connections");
			return;
		}

		this.logger.info("Starting to listen for extension channels");

		// Listen for new connections
		this.extensionChannelProvider.on(
			"connected",
			this.handleConnectionConnected,
		);

		// Listen for disconnections
		this.extensionChannelProvider.on(
			"disconnected",
			this.handleConnectionDisconnected,
		);

		this.isListening = true;
		this.logger.info("Successfully started listening for extension channels");
	};

	private handleConnectionConnected = async (
		channel: ChannelInfo,
	): Promise<void> => {
		this.logger.info("Extension channel connected", {
			channelId: channel.channelId,
		});

		this.channels.set(channel.channelId, channel);

		// Create MessageChannelRpcClient for the new channel
		try {
			const messageChannel = this.extensionChannelProvider.getMessageChannel(
				channel.channelId,
			);
			const rpcClient =
				new MessageChannelRpcClient<ExtensionToolCallInputPort>();
			rpcClient.bindChannel(messageChannel);

			this.rpcClients.set(channel.channelId, rpcClient);

			this.logger.verbose(
				"Extension channel and RPC client added to active channels",
				{
					channelId: channel.channelId,
					totalChannels: this.channels.size,
				},
			);

			// Get extension context to retrieve browserId
			try {
				const context = await rpcClient.call({
					method: "getExtensionContext",
					args: [],
					extraArgs: {},
				});

				this.browserIdToChannelId.set(context.browserId, channel.channelId);

				this.logger.info("Browser instance mapped to channel", {
					browserId: context.browserId,
					browserName: context.browserInfo.browserName,
					browserVersion: context.browserInfo.browserVersion,
					channelId: channel.channelId,
				});
			} catch (error) {
				this.logger.error("Failed to get extension context", {
					channelId: channel.channelId,
					error,
				});
			}
		} catch (error) {
			this.logger.error("Failed to create RPC client for channel", {
				channelId: channel.channelId,
				error,
			});
		}
	};

	private handleConnectionDisconnected = (channel: ChannelInfo): void => {
		this.logger.info("Extension channel disconnected", {
			channelId: channel.channelId,
		});

		this.channels.delete(channel.channelId);

		// Clean up the RPC client
		const rpcClient = this.rpcClients.get(channel.channelId);
		if (rpcClient) {
			rpcClient.unbindChannel();
			this.rpcClients.delete(channel.channelId);
		}

		// Clean up browserId mapping
		for (const [browserId, channelId] of this.browserIdToChannelId) {
			if (channelId === channel.channelId) {
				this.browserIdToChannelId.delete(browserId);
				break;
			}
		}

		this.logger.verbose(
			"Extension channel and RPC client removed from active channels",
			{
				channelId: channel.channelId,
				totalChannels: this.channels.size,
			},
		);
	};

	/**
	 * Get all active RPC clients
	 * @returns Array of RPC clients
	 */
	public getRpcClients = (): Array<
		MessageChannelRpcClient<ExtensionToolCallInputPort>
	> => {
		return Array.from(this.rpcClients.values());
	};

	/**
	 * Get a specific RPC client by browser ID
	 * @param browserId - The browser ID to get the RPC client for
	 * @returns The RPC client
	 * @throws Error if no RPC client is found for the given browser ID
	 */
	public getRpcClientByBrowserId = (
		browserId: string,
	): MessageChannelRpcClient<ExtensionToolCallInputPort> => {
		const channelId = this.browserIdToChannelId.get(browserId);
		if (!channelId) {
			throw new Error(`No channel found for browser instance: ${browserId}`);
		}
		const rpcClient = this.rpcClients.get(channelId);
		if (!rpcClient) {
			throw new Error(`No RPC client found for channel: ${channelId}`);
		}
		return rpcClient;
	};
}
