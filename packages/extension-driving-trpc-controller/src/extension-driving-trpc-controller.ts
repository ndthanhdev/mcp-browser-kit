import type { ServerChannelInfo } from "@mcp-browser-kit/core-extension";
import {
	ExtensionToolCallInputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { MessageChannelRpcServer } from "@mcp-browser-kit/utils";
import { inject, injectable } from "inversify";

@injectable()
export class ExtensionDrivingTrpcController {
	private readonly logger;
	private readonly rpcServers = new Map<
		string,
		MessageChannelRpcServer<ExtensionToolCallInputPort>
	>();
	private readonly channelListeners = new Map<string, () => void>();
	private serverChannelProvider?: ExtensionDrivenServerChannelProvider;

	constructor(
		@inject(ExtensionToolCallInputPort)
		private readonly _toolCallHandlers: ExtensionToolCallInputPort,
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("ExtensionDrivingTrpcController");
	}

	/**
	 * Connects to a ExtensionDrivenServerChannelProvider and listens for connect/disconnect events
	 */
	public listenToServerChannelEvents = (
		serverChannelProvider: ExtensionDrivenServerChannelProvider,
	): (() => void) => {
		this.logger.info("Setting up server channel event listeners");

		// Store reference to the server channel provider
		this.serverChannelProvider = serverChannelProvider;

		// Listen for connected events
		const unsubscribeConnected = serverChannelProvider.on(
			"connected",
			this.handleServerConnected,
		);

		// Listen for disconnected events
		const unsubscribeDisconnected = serverChannelProvider.on(
			"disconnected",
			this.handleServerDisconnected,
		);

		this.logger.info("Server channel event listeners established");

		// Return cleanup function that unsubscribes from both events
		return () => {
			unsubscribeConnected();
			unsubscribeDisconnected();
			this.serverChannelProvider = undefined;

			// Unsubscribe from all channel listeners but keep RPC servers persistent
			for (const [channelId, unsubscribe] of this.channelListeners.entries()) {
				unsubscribe();
				this.channelListeners.delete(channelId);
				this.logger.info("Channel listener unsubscribed", {
					channelId,
				});
			}

			// RPC servers remain persistent for potential reuse
			this.logger.info(
				"Server channel event listeners cleaned up, RPC servers persisted",
				{
					persistentRpcServers: this.rpcServers.size,
				},
			);
		};
	};

	private handleServerConnected = (channel: ServerChannelInfo): void => {
		this.logger.info("Server connected", {
			channelId: channel.channelId,
		});

		try {
			if (!this.serverChannelProvider) {
				this.logger.error("Server channel provider not available");
				return;
			}

			// Get or create a persistent RPC server for this channel
			let rpcServer = this.rpcServers.get(channel.channelId);
			if (!rpcServer) {
				rpcServer = new MessageChannelRpcServer(this._toolCallHandlers);
				this.rpcServers.set(channel.channelId, rpcServer);
				this.logger.info("New persistent MessageChannelRpcServer created", {
					channelId: channel.channelId,
				});
			} else {
				this.logger.info("Reusing persistent MessageChannelRpcServer", {
					channelId: channel.channelId,
				});
			}

			// Get the message channel for this connection
			const messageChannel = this.serverChannelProvider.getMessageChannel(
				channel.channelId,
			);

			// Start listening on the message channel
			const unsubscribe = rpcServer.startListen(messageChannel);

			// Store the unsubscribe function for channel cleanup
			this.channelListeners.set(channel.channelId, unsubscribe);

			this.logger.info("Persistent MessageChannelRpcServer now listening", {
				channelId: channel.channelId,
			});
		} catch (error) {
			this.logger.error("Failed to set up RPC server for channel", {
				channelId: channel.channelId,
				error,
			});
		}
	};

	private handleServerDisconnected = (channel: ServerChannelInfo): void => {
		this.logger.info("Server disconnected", {
			channelId: channel.channelId,
		});

		// Unsubscribe from the channel but keep the RPC server persistent
		const unsubscribe = this.channelListeners.get(channel.channelId);
		if (unsubscribe) {
			unsubscribe();
			this.channelListeners.delete(channel.channelId);
			this.logger.info("Channel listener unsubscribed, RPC server persisted", {
				channelId: channel.channelId,
			});
		} else {
			this.logger.warn("No channel listener found for disconnected channel", {
				channelId: channel.channelId,
			});
		}

		// RPC server remains in the map for potential reconnection
		const rpcServer = this.rpcServers.get(channel.channelId);
		if (rpcServer) {
			this.logger.info("RPC server persisted for potential reconnection", {
				channelId: channel.channelId,
			});
		}
	};

	/**
	 * Explicitly clean up all persistent RPC servers (call only on shutdown)
	 */
	public destroyAllRpcServers = (): void => {
		this.logger.info("Destroying all persistent RPC servers");

		// First unsubscribe from all active channel listeners
		for (const [channelId, unsubscribe] of this.channelListeners.entries()) {
			unsubscribe();
			this.channelListeners.delete(channelId);
		}

		// Then destroy all RPC servers
		for (const [channelId, rpcServer] of this.rpcServers.entries()) {
			rpcServer.stopListen();
			this.rpcServers.delete(channelId);
		}

		this.logger.info("All persistent RPC servers destroyed");
	};
}
