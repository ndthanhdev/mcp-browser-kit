import { inject, injectable } from "inversify";
import type { ManageChannelsInputPort } from "../input-ports";
import type { ServerChannelInfo } from "../output-ports";
import {
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "../output-ports";

@injectable()
export class ManageChannelUseCases implements ManageChannelsInputPort {
	private readonly logger;
	private readonly channels = new Map<string, ServerChannelInfo>();
	private isListening = false;

	constructor(
		@inject(ServerChannelProviderOutputPort)
		private readonly serverChannelProvider: ServerChannelProviderOutputPort,
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("ManageChannelUseCases");
	}

	start = async (): Promise<void> => {
		if (this.isListening) {
			this.logger.warn("Already listening for connections");
			return;
		}

		this.logger.info("Starting to listen for server channels");

		// Listen for new connections
		this.serverChannelProvider.on("connected", this.handleConnectionConnected);

		// Listen for disconnections
		this.serverChannelProvider.on(
			"disconnected",
			this.handleConnectionDisconnected,
		);

		// Listen for connection updates

		this.isListening = true;
		this.logger.info("Successfully started listening for server channels");
	};

	private handleConnectionConnected = (channel: ServerChannelInfo): void => {
		this.logger.info("Server channel established", {
			channelId: channel.channelId,
		});

		this.channels.set(channel.channelId, channel);

		this.logger.verbose("Channel added to active channels", {
			channelId: channel.channelId,
			totalChannels: this.channels.size,
		});
	};

	private handleConnectionDisconnected = (channel: ServerChannelInfo): void => {
		this.logger.info("Server channel disconnected", {
			channelId: channel.channelId,
		});

		this.channels.delete(channel.channelId);

		this.logger.verbose("Channel removed from active channels", {
			channelId: channel.channelId,
			totalChannels: this.channels.size,
		});
	};

	/**
	 * Get all currently active channels
	 */
	getActiveChannels = (): ServerChannelInfo[] => {
		return Array.from(this.channels.values());
	};

	/**
	 * Get a specific channel by ID
	 */
	getChannel = (channelId: string): ServerChannelInfo | undefined => {
		return this.channels.get(channelId);
	};

	/**
	 * Check if currently listening for channels
	 */
	getIsListening = (): boolean => {
		return this.isListening;
	};

	/**
	 * Get the count of active channels
	 */
	getChannelCount = (): number => {
		return this.channels.size;
	};
}
