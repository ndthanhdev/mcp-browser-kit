import type {
	ExtensionDriverProviderEventEmitter,
	ServerChannelInfo,
} from "@mcp-browser-kit/core-extension";
import {
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import type {
	DeferMessage,
	MessageChannelForRpcServer,
} from "@mcp-browser-kit/core-utils";
import {
	createPrefixId,
	EmitteryMessageChannel,
} from "@mcp-browser-kit/core-utils";
import type { RootRouter } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import type { MessageChannel } from "@mcp-browser-kit/types";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	type TRPCClient,
	type TRPCWebSocketClient,
	wsLink,
} from "@trpc/client";
import Emittery from "emittery";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { ServerDiscoverer } from "./server-discoverer";

@injectable()
export class ExtensionDrivenServerChannelProvider
	implements ServerChannelProviderOutputPort
{
	private static readonly RETRY_DELAY_MS = 10000;
	private static readonly serverChannelProviderId = createPrefixId(
		"server-channel-provider",
	);
	private static readonly channelId = createPrefixId("channel");

	/**
	 * Setup container bindings for ExtensionDrivenServerChannelProvider and its dependencies
	 */
	static setupContainer(container: Container): void {
		// Server discoverer
		container.bind<ServerDiscoverer>(ServerDiscoverer).to(ServerDiscoverer);

		// Extension-driven server channel provider (bound to output port interface)
		container
			.bind<ServerChannelProviderOutputPort>(ServerChannelProviderOutputPort)
			.to(ExtensionDrivenServerChannelProvider);
	}

	private readonly instanceId: string;
	private readonly eventEmitter: ExtensionDriverProviderEventEmitter;
	private readonly channels = new Map<string, ServerChannelInfo>();
	private readonly messageChannels = new Map<string, MessageChannel>();
	private readonly wsClients = new Map<string, TRPCWebSocketClient>();
	private readonly trpcClients = new Map<string, TRPCClient<RootRouter>>();
	private readonly channelsByUrl = new Map<string, string>(); // serverUrl -> channelId
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
		@inject(ServerDiscoverer)
		private readonly serverDiscoverer: ServerDiscoverer,
	) {
		this.instanceId =
			ExtensionDrivenServerChannelProvider.serverChannelProviderId.generate();
		this.logger = this.loggerFactory.create("ExtensionDrivenServerProvider");

		this.eventEmitter = new Emittery<{
			connected: ServerChannelInfo;
			disconnected: ServerChannelInfo;
		}>();

		// Listen to server discovery events
		this.serverDiscoverer.on("online", this.handleServerOnline);
		this.serverDiscoverer.on("offline", this.handleServerOffline);

		this.logger.verbose(
			`[${this.instanceId}] Initialized ExtensionDrivenServerProvider with ServerDiscoverer`,
		);
	}

	on: ExtensionDriverProviderEventEmitter["on"] = (event, callback) => {
		return this.eventEmitter.on(event, callback);
	};

	startServersDiscovering = async (): Promise<void> => {
		this.logger.verbose(
			`[${this.instanceId}] Starting discovery and connection to servers`,
		);

		// If there are any existing channels, log warning and resolve
		if (this.channels.size > 0) {
			this.logger.warn(
				`[${this.instanceId}] Existing channels detected (${this.channels.size}). Skipping server discovery.`,
			);
			return;
		}

		// Start server discovery - it will emit events for active servers
		await this.serverDiscoverer.startDiscovery();

		this.logger.verbose(
			`[${this.instanceId}] Discovery and connection process completed`,
		);
	};

	private handleServerOnline = ({ url }: { url: string }): void => {
		this.logger.verbose(
			`[${this.instanceId}] Server at ${url} is online, initiating connection`,
		);
		this.connectToServer(url).catch((error) => {
			this.logger.verbose(
				`[${this.instanceId}] Failed to connect to server at ${url}:`,
				error,
			);
		});
	};

	private handleServerOffline = ({ url }: { url: string }): void => {
		this.logger.verbose(
			`[${this.instanceId}] Server at ${url} is offline, cleaning up connection`,
		);
		const channelId = this.channelsByUrl.get(url);
		if (channelId) {
			this.cleanupConnection(channelId, url);
		}
	};

	private connectToServer = async (serverUrl: string): Promise<void> => {
		const channelId = ExtensionDrivenServerChannelProvider.channelId.generate();

		this.logger.verbose(
			`[${this.instanceId}] Attempting to connect to server at ${serverUrl}`,
		);

		try {
			// Create WebSocket client with connection validation
			const wsClient = createWSClient({
				url: serverUrl,
				// biome-ignore lint/style/useNamingConvention: it's a library attribute name
				WebSocket: WebSocket,
				onError: (error) => {
					this.logger.info(
						`[${this.instanceId}] Connection to server at ${serverUrl} failed:`,
						error,
					);
				},
				retryDelayMs: () => ExtensionDrivenServerChannelProvider.RETRY_DELAY_MS,
			});

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
	};

	private setupMessageHandling = (
		channelId: string,
		trpcClient: TRPCClient<RootRouter>,
		messageChannel: MessageChannelForRpcServer,
	): void => {
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
				onData: async (data: DeferMessage) => {
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
	};

	private setupConnectionMonitoring = (
		channelId: string,
		serverUrl: string,
		wsClient: TRPCWebSocketClient,
	): void => {
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
	};

	private cleanupConnection = (channelId: string, serverUrl: string): void => {
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
	};

	getMessageChannel = (channelId: string): MessageChannel => {
		const messageChannel = this.messageChannels.get(channelId);
		if (!messageChannel) {
			throw new Error(`No message channel found for channel ${channelId}`);
		}
		return messageChannel;
	};
}
