import type {
	ChannelInfo,
	ExtensionChannelProviderOutputPort,
	ExtensionDriverProviderEventEmitter,
} from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server/output-ports/logger-factory";
import type {
	DeferData,
	MessageChannelForRpcClient,
	ResolveData,
} from "@mcp-browser-kit/core-utils";
import {
	createPrefixId,
	EmitteryMessageChannel,
} from "@mcp-browser-kit/core-utils";
import Emittery from "emittery";
import { inject, injectable } from "inversify";

const channelId = createPrefixId("channel");

@injectable()
export class HelperBaseExtensionChannelProvider
	implements ExtensionChannelProviderOutputPort
{
	private readonly eventEmitter: ExtensionDriverProviderEventEmitter;
	private readonly channels = new Map<string, ChannelInfo>();
	private readonly messageChannels = new Map<
		string,
		MessageChannelForRpcClient
	>();
	private readonly logger;
	public readonly on: ExtensionDriverProviderEventEmitter["on"];

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create(
			"HelperBaseExtensionChannelProvider",
		);

		this.eventEmitter = new Emittery<{
			connected: ChannelInfo;
			disconnected: ChannelInfo;
		}>();

		// Bind the on method after eventEmitter is initialized
		this.on = this.eventEmitter.on.bind(this.eventEmitter);

		this.logger.verbose("Initialized HelperBaseExtensionChannelProvider");
	}

	getMessageChannel = (channelId: string): MessageChannelForRpcClient => {
		this.logger.verbose(`Getting message channel for channelId: ${channelId}`);

		const messageChannel = this.messageChannels.get(channelId);
		if (!messageChannel) {
			this.logger.verbose(
				`Message channel not found for channelId: ${channelId}`,
			);
			throw new Error(`Message channel not found for channelId: ${channelId}`);
		}

		return messageChannel;
	};

	/**
	 * Opens a new channel and returns a MessageChannelRpcServerType
	 * @param channelId - Required channelId, must be a valid channel ID with prefix 'sch-' and not already exist
	 * @returns MessageChannelRpcServerType for the newly created channel
	 * @throws Error if channelId is not valid or already exists
	 */
	public openChannel = (id: string): MessageChannelForRpcClient => {
		// Validate channelId has the correct prefix format
		if (!channelId.isValid(id)) {
			this.logger.verbose(`Invalid channel ID format: ${id}`);
			throw new Error(`Invalid channel ID format: ${id}`);
		}

		// Validate channelId doesn't already exist
		if (this.channels.has(id)) {
			this.logger.verbose(`Channel with id ${id} already exists`);
			throw new Error(`Channel with id ${id} already exists`);
		}

		if (this.messageChannels.has(id)) {
			this.logger.verbose(`Message channel with id ${id} already exists`);
			throw new Error(`Message channel with id ${id} already exists`);
		}
		this.logger.verbose(`Opening channel: ${id}`);

		const channelInfo: ChannelInfo = {
			channelId: id,
		};
		this.channels.set(id, channelInfo);

		// Create actual MessageChannel and store it
		const messageChannel = new EmitteryMessageChannel<DeferData, ResolveData>();
		this.messageChannels.set(id, messageChannel);

		this.eventEmitter.emit("connected", channelInfo);

		return messageChannel;
	};

	/**
	 * Placeholder method for closing channels based on server commands
	 * @param channelId - The ID of the channel to close
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public closeChannel = (channelId: string): void => {
		this.logger.verbose(`Closing channel: ${channelId}`);

		const channelInfo = this.channels.get(channelId);
		if (channelInfo) {
			this.channels.delete(channelId);
			this.messageChannels.delete(channelId);

			this.eventEmitter.emit("disconnected", channelInfo);
			this.logger.verbose(`Channel ${channelId} closed successfully`);
		} else {
			this.logger.verbose(`Channel ${channelId} not found for closing`);
		}
	};
}
