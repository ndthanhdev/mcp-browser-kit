import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import {
	type DeferData,
	type DeferMessage,
	EmitteryMessageChannel,
	MessageChannelRpcServer,
	type ResolveData,
	type ResolveMessage,
} from "@mcp-browser-kit/core-utils";
import type { Func, Logger, LoggerFactory } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import type { Get, Paths } from "type-fest";
import browser, { type Runtime } from "webextension-polyfill";
import { TabTools } from "./tab-tools";

export type ToolKeys = Paths<
	TabTools,
	{
		bracketNotation: false;
		maxRecursionDepth: 2;
	}
>;

export type GetTool<T extends ToolKeys> = Get<TabTools, T> extends Func
	? Get<TabTools, T>
	: never;

export const tabToolsIdentifier = "$mcpBrowserKit";

export type McpBrowserKitGlobal = {
	tabTools: TabTools;
};

declare global {
	var $mcpBrowserKit: McpBrowserKitGlobal;
}

const theGlobal = globalThis as unknown as {
	[tabToolsIdentifier]: McpBrowserKitGlobal;
};

export interface CallToolArgs<T extends ToolKeys> {
	tool: T;
	args: Parameters<GetTool<T>> extends never
		? undefined
		: Parameters<GetTool<T>>;
}

/**
 * Class for managing tab tools setup and configuration.
 */
@injectable()
export class TabToolsSetup {
	private readonly logger: Logger;
	private readonly channel: EmitteryMessageChannel<DeferData, ResolveData>;
	private readonly rpcServer: MessageChannelRpcServer<TabTools>;
	private channelUnsubscribe?: () => void;
	private rpcServerUnsubscribe?: () => void;
	private browserMessageUnsubscribe?: () => void;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactory,
		@inject(TabTools)
		private readonly tabTools: TabTools,
	) {
		this.logger = loggerFactory.create("TabToolsSetup");

		// Initialize EmitteryMessageChannel for server communication
		this.channel = new EmitteryMessageChannel<DeferData, ResolveData>();
		this.logger.verbose("Created EmitteryMessageChannel");

		// Initialize the RPC server with tab tools
		this.rpcServer = new MessageChannelRpcServer(this.tabTools);
		this.logger.verbose("Created MessageChannelRpcServer with tab tools");

		// Connect the server to the EmitteryMessageChannel
		this.rpcServerUnsubscribe = this.rpcServer.startListen(this.channel);
		this.logger.verbose("Connected RPC server to EmitteryMessageChannel");

		this.logger.info("TabToolsSetup initialized successfully");
	}

	private createMcpBrowserKitGlobal = (): McpBrowserKitGlobal => {
		return {
			tabTools: this.tabTools,
		};
	};

	/**
	 * Sets up the tab script tools in the global scope.
	 */
	setUpTabTools = (): void => {
		this.logger.verbose("Setting up tab tools in global scope");

		if (!theGlobal[tabToolsIdentifier]) {
			theGlobal[tabToolsIdentifier] = this.createMcpBrowserKitGlobal();
			this.logger.info("Tab tools successfully set up in global scope");
		} else {
			this.logger.verbose("Tab tools already set up in global scope");
		}
	};

	/**
	 * Gets the RPC server instance.
	 */
	get server(): MessageChannelRpcServer<TabTools> {
		return this.rpcServer;
	}

	/**
	 * Gets the message channel instance.
	 */
	get messageChannel(): EmitteryMessageChannel<DeferData, ResolveData> {
		return this.channel;
	}

	/**
	 * Handles browser runtime messages and forwards them through the channel.
	 */
	private handleBrowserMessage = (
		request: unknown,
		_sender: Runtime.MessageSender,
	) => {
		this.logger.verbose("Received browser runtime message:", request);

		const responseDeferred = Promise.withResolvers<ResolveMessage>();

		try {
			const deferMessage = request as DeferMessage;

			// Set up one-time listener for this specific message's response
			const responseHandler = (resolveMessage: ResolveMessage) => {
				if (resolveMessage.id === deferMessage.id) {
					this.logger.verbose("Sending response:", resolveMessage);
					responseDeferred.resolve(resolveMessage);
					// Remove this specific listener
					unsubscribe();
				}
			};

			// Listen for the response and get unsubscribe function
			const unsubscribe = this.channel.outgoing.on("resolve", responseHandler);

			// Send the message through the channel
			this.logger.verbose("Forwarding message to channel:", deferMessage);
			this.channel.incoming.emit("defer", deferMessage);
		} catch (error) {
			this.logger.error("Error handling browser runtime message:", error);
			responseDeferred.resolve({
				id: (request as DeferMessage)?.id || "unknown",
				isOk: false,
				result: error instanceof Error ? error.message : "Unknown error",
			});
		}

		return responseDeferred.promise;
	};

	/**
	 * Starts listening for browser runtime messages and forwards them through the channel.
	 */
	startListen = (): void => {
		this.logger.info("Starting to listen for browser runtime messages");

		// Set up response listener for the channel
		this.channelUnsubscribe = this.channel.outgoing.on(
			"resolve",
			(resolveMessage: ResolveMessage) => {
				this.logger.verbose(
					"Received resolve message from channel:",
					resolveMessage,
				);
				// The resolve message will be handled by the specific message handler
			},
		);

		// Add the browser message listener and store unsubscribe function
		browser.runtime.onMessage.addListener(this.handleBrowserMessage);
		this.browserMessageUnsubscribe = () => {
			browser.runtime.onMessage.removeListener(this.handleBrowserMessage);
		};

		this.logger.info("Browser runtime message listener started successfully");
	};

	/**
	 * Stops listening and cleans up all event listeners.
	 */
	stopListen = (): void => {
		this.logger.info("Stopping listeners and cleaning up");

		// Stop channel listener
		if (this.channelUnsubscribe) {
			try {
				this.channelUnsubscribe();
				this.logger.verbose("Unsubscribed channel listener");
				this.channelUnsubscribe = undefined;
			} catch (error) {
				this.logger.error("Error unsubscribing channel listener:", error);
			}
		}

		// Stop RPC server listener
		if (this.rpcServerUnsubscribe) {
			try {
				this.rpcServerUnsubscribe();
				this.logger.verbose("Unsubscribed RPC server listener");
				this.rpcServerUnsubscribe = undefined;
			} catch (error) {
				this.logger.error("Error unsubscribing RPC server listener:", error);
			}
		}

		// Stop browser message listener
		if (this.browserMessageUnsubscribe) {
			try {
				this.browserMessageUnsubscribe();
				this.logger.verbose("Unsubscribed browser message listener");
				this.browserMessageUnsubscribe = undefined;
			} catch (error) {
				this.logger.error(
					"Error unsubscribing browser message listener:",
					error,
				);
			}
		}

		// Stop the RPC server (redundant safety call)
		this.rpcServer.stopListen();

		this.logger.info("All listeners stopped and cleaned up successfully");
	};
}
