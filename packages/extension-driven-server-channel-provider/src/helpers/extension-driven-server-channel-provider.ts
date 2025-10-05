import type {
	ExtensionDriverProviderEventEmitter,
	ServerChannelInfo,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import type { MessageChannel } from "@mcp-browser-kit/types";
import type { MessageChannelForRpcServer } from "@mcp-browser-kit/utils";
import { createPrefixId, EmitteryMessageChannel } from "@mcp-browser-kit/utils";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	type TRPCClient,
	type TRPCWebSocketClient,
	wsLink,
} from "@trpc/client";
import Emittery from "emittery";
import { inject, injectable } from "inversify";

@injectable()
export class ExtensionDrivenServerChannelProvider
	implements ServerChannelProviderOutputPort
{
	private static readonly MIN_PORT = 2769;
	private static readonly MAX_PORT = 2799;
	private static readonly CONNECTION_TIMEOUT = 3000;
	private static readonly serverChannelProviderId = createPrefixId("schp");

	private readonly instanceId: string;
	private readonly eventEmitter: ExtensionDriverProviderEventEmitter;
	private readonly channels = new Map<string, ServerChannelInfo>();
	private readonly messageChannels = new Map<string, MessageChannel>();
	private readonly wsClients = new Map<string, TRPCWebSocketClient>();
	private readonly trpcClients = new Map<string, TRPCClient<RootRouter>>();
	private readonly channelsByUrl = new Map<string, string>(); // serverUrl -> channelId
	private readonly serverUrls: string[];
	private readonly logger;
	private monitoringSubscriptions?: Map<
		string,
		{
			unsubscribe: () => void;
		}
	>;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.instanceId =
			ExtensionDrivenServerChannelProvider.serverChannelProviderId.generate();
		this.logger = this.loggerFactory.create("ExtensionDrivenServerProvider");

		this.eventEmitter = new Emittery<{
			connected: ServerChannelInfo;
			disconnected: ServerChannelInfo;
		}>();

		// Generate URLs from localhost port range
		this.serverUrls = [];
		for (
			let port = ExtensionDrivenServerChannelProvider.MIN_PORT;
			port <= ExtensionDrivenServerChannelProvider.MAX_PORT;
			port++
		) {
			this.serverUrls.push(`ws://localhost:${port}`);
		}

		this.logger.verbose(
			`[${this.instanceId}] Initialized ExtensionDrivenServerProvider with ${this.serverUrls.length} potential server URLs`,
		);
	}

	on: ExtensionDriverProviderEventEmitter["on"] = (event, callback) => {
		return this.eventEmitter.on(event, callback);
	};

	discoverAndConnectToServers = async (): Promise<void> => {
		this.logger.verbose(
			`[${this.instanceId}] Starting discovery and connection to servers`,
		);

		// Filter out URLs that are already connected
		const unconnectedUrls = this.serverUrls.filter((serverUrl) => {
			const existingChannelId = this.channelsByUrl.get(serverUrl);
			if (existingChannelId) {
				// Check if the channel still exists and is valid
				const channel = this.channels.get(existingChannelId);
				if (channel) {
					this.logger.verbose(
						`[${this.instanceId}] Skipping ${serverUrl} - already connected`,
					);
					return false;
				}
				// Channel was removed but URL mapping still exists, clean it up
				this.channelsByUrl.delete(serverUrl);
				return true;
			}
			return true;
		});

		if (unconnectedUrls.length === 0) {
			this.logger.verbose(
				`[${this.instanceId}] All servers are already connected`,
			);
			return;
		}

		this.logger.verbose(
			`[${this.instanceId}] Attempting to connect to ${unconnectedUrls.length} unconnected servers`,
		);

		const connectionPromises = unconnectedUrls.map(async (serverUrl) => {
			try {
				await this.connectToServer(serverUrl);
			} catch (error) {
				this.logger.verbose(
					`[${this.instanceId}] Failed to connect to ${serverUrl}:`,
					error,
				);
			}
		});

		await Promise.allSettled(connectionPromises);
		this.logger.verbose(
			`[${this.instanceId}] Discovery and connection process completed`,
		);
	};

	private async connectToServer(serverUrl: string): Promise<void> {
		const channelId =
			ExtensionDrivenServerChannelProvider.serverChannelProviderId.generate();

		this.logger.verbose(
			`[${this.instanceId}] Attempting to connect to server at ${serverUrl}`,
		);

		try {
			// Create WebSocket client with connection validation
			const wsClient = await this.createWebSocketClient(serverUrl);

			// Create TRPC client
			const trpcClient = createTRPCClient<RootRouter>({
				links: [
					loggerLink(),
					wsLink({
						client: wsClient,
					}),
				],
			});

			// Create message channel
			const messageChannel = new EmitteryMessageChannel();

			// Store clients
			this.wsClients.set(channelId, wsClient);
			this.trpcClients.set(channelId, trpcClient);
			this.messageChannels.set(channelId, messageChannel);
			this.channelsByUrl.set(serverUrl, channelId);

			// Connection successful - set up message handling
			this.setupMessageHandling(channelId, trpcClient, messageChannel);

			// Set up connection monitoring for automatic cleanup on disconnect
			this.setupConnectionMonitoring(channelId, serverUrl, wsClient);

			// Create server channel object
			const serverChannel: ServerChannelInfo = {
				channelId: channelId,
			};

			this.channels.set(channelId, serverChannel);
			this.logger.verbose(
				`[${this.instanceId}] Successfully connected to server at ${serverUrl}`,
			);

			// Emit connected event
			this.eventEmitter.emit("connected", serverChannel);
		} catch (error) {
			// Connection failed or timed out - cleanup
			this.logger.verbose(
				`[${this.instanceId}] Connection to ${serverUrl} failed or timed out, cleaning up`,
			);
			this.cleanupConnection(channelId, serverUrl);
			throw error;
		}
	}

	private async createWebSocketClient(
		serverUrl: string,
	): Promise<TRPCWebSocketClient> {
		// Create deferred promise using Promise.withResolvers()
		const { promise, resolve, reject } =
			Promise.withResolvers<TRPCWebSocketClient>();

		// Set up connection timeout
		const timeoutId = setTimeout(() => {
			reject(new Error("Connection timeout"));
		}, ExtensionDrivenServerChannelProvider.CONNECTION_TIMEOUT);

		let isResolved = false;

		const handleSuccess = () => {
			if (!isResolved) {
				isResolved = true;
				clearTimeout(timeoutId);
				resolve(wsClient);
			}
		};

		const handleError = (error: unknown) => {
			if (!isResolved) {
				isResolved = true;
				clearTimeout(timeoutId);
				reject(error);
			}
		};

		// Create WebSocket client
		const wsClient = createWSClient({
			url: serverUrl,
		});

		// Subscribe to connection state changes
		const subscription = wsClient.connectionState.subscribe({
			next: (state) => {
				// Handle different connection states
				if (state.type === "state" && state.state === "idle") {
					// Connection is established and idle (ready)
					handleSuccess();
				} else if (state.type === "state" && state.state === "connecting") {
					// Still connecting, wait
				} else if (state.type === "state" && state.state === "pending") {
					// Pending state, wait
				}
			},
			error: (error) => {
				handleError(error);
			},
		});

		// Clean up subscription when promise settles
		promise.finally(() => {
			subscription.unsubscribe();
		});

		return promise;
	}

	private setupMessageHandling(
		channelId: string,
		trpcClient: TRPCClient<RootRouter>,
		messageChannel: MessageChannelForRpcServer,
	): void {
		const deferLogger = this.loggerFactory.create(
			"ExtensionDrivenServerProvider",
			"defer",
		);

		// Set up defer message handling
		trpcClient.defer.onMessage.subscribe(
			{
				channelId,
			},
			{
				onData: async (data) => {
					deferLogger.verbose("defer", data);
					messageChannel.incoming.emit("defer", data);
				},
			},
		);

		// Set up resolve message handling
		messageChannel.outgoing.on("resolve", (message) => {
			deferLogger.verbose("resolve", message);
			trpcClient.defer.resolve.mutate({
				...message,
				channelId,
			});
		});
	}

	private setupConnectionMonitoring(
		channelId: string,
		serverUrl: string,
		wsClient: TRPCWebSocketClient,
	): void {
		this.logger.verbose(
			`[${this.instanceId}] Connection monitoring set up for ${serverUrl}`,
		);

		// Subscribe to connection state changes for monitoring
		const subscription = wsClient.connectionState.subscribe({
			next: (state) => {
				// Handle connection state changes
				if (state.type === "state" && state.state === "connecting") {
					this.logger.verbose(
						`[${this.instanceId}] Channel ${channelId} to ${serverUrl} is reconnecting`,
					);
				} else if (state.type === "state" && state.state === "idle") {
					this.logger.verbose(
						`[${this.instanceId}] Channel ${channelId} to ${serverUrl} is stable`,
					);
				} else if (state.type === "state" && state.state === "pending") {
					this.logger.verbose(
						`[${this.instanceId}] Channel ${channelId} to ${serverUrl} has pending operations`,
					);
				}
			},
			error: (error) => {
				this.logger.verbose(
					`[${this.instanceId}] Channel ${channelId} to ${serverUrl} encountered error:`,
					error,
				);
				// Clean up the connection on error
				this.cleanupConnection(channelId, serverUrl);
			},
		});

		// Store the subscription for cleanup later
		// We'll add a map to track monitoring subscriptions
		if (!this.monitoringSubscriptions) {
			this.monitoringSubscriptions = new Map();
		}
		this.monitoringSubscriptions.set(channelId, subscription);
	}

	private cleanupConnection(channelId: string, serverUrl: string): void {
		// Get channel before cleanup for event emission
		const channel = this.channels.get(channelId);

		// Remove from maps
		const wsClient = this.wsClients.get(channelId);

		// Close WebSocket connection
		if (wsClient) {
			wsClient.close();
		}

		// Clean up monitoring subscription
		if (this.monitoringSubscriptions) {
			const subscription = this.monitoringSubscriptions.get(channelId);
			if (subscription) {
				subscription.unsubscribe();
				this.monitoringSubscriptions.delete(channelId);
			}
		}

		// Cleanup maps
		this.wsClients.delete(channelId);
		this.trpcClients.delete(channelId);
		this.messageChannels.delete(channelId);
		this.channelsByUrl.delete(serverUrl);
		this.channels.delete(channelId);

		// Emit disconnected event if channel existed
		if (channel) {
			this.logger.verbose(
				`[${this.instanceId}] Channel ${channelId} to ${serverUrl} cleaned up`,
			);
			this.eventEmitter.emit("disconnected", channel);
		}
	}

	getMessageChannel = (channelId: string): MessageChannel => {
		const messageChannel = this.messageChannels.get(channelId);
		if (!messageChannel) {
			throw new Error(`No message channel found for channel ${channelId}`);
		}
		return messageChannel;
	};
}
