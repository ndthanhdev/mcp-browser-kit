import type { ExtensionToolCallInputPort } from "@mcp-browser-kit/core-extension";
import {
	MessageChannelRpcClient,
	shortChannelId,
} from "@mcp-browser-kit/core-utils";
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

	private handleConnectionConnected = (channel: ChannelInfo): void => {
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
					browserId: shortChannelId(channel.channelId),
					totalChannels: this.channels.size,
				},
			);
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
	 * Get all active RPC clients paired with their channelId.
	 * @returns Array of [channelId, rpcClient] entries
	 */
	public getRpcClientEntries = (): Array<
		[
			string,
			MessageChannelRpcClient<ExtensionToolCallInputPort>,
		]
	> => {
		return Array.from(this.rpcClients.entries());
	};

	/**
	 * Get the RPC client for a specific channel.
	 * @param channelId - The channel ID
	 * @returns The RPC client, or undefined if no client exists for the channel
	 */
	public getRpcClientByChannelId = (
		channelId: string,
	): MessageChannelRpcClient<ExtensionToolCallInputPort> | undefined => {
		return this.rpcClients.get(channelId);
	};

	/**
	 * Get a specific RPC client by browserId (the short channel id — the
	 * `channel:` prefix stripped from the full channelId). Scans the active
	 * channels for the one whose short id matches.
	 * @param browserId - The short channel id to get the RPC client for
	 * @returns The RPC client
	 * @throws Error if no RPC client is found for the given browserId
	 */
	public getRpcClientByBrowserId = (
		browserId: string,
	): MessageChannelRpcClient<ExtensionToolCallInputPort> => {
		for (const [channelId, rpcClient] of this.rpcClients) {
			if (shortChannelId(channelId) === browserId) {
				return rpcClient;
			}
		}

		throw new Error(`No channel found for browser instance: ${browserId}`);
	};
}
