import {
	type ExtensionChannelProviderOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { HelperBaseExtensionChannelProvider } from "@mcp-browser-kit/helper-base-extension-channel-provider";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { PortFinder } from "./port-finder";

@injectable()
export class ServerDrivenTrpcChannelProvider
	implements ExtensionChannelProviderOutputPort
{
	public readonly on: ExtensionChannelProviderOutputPort["on"];

	constructor(
		@inject(LoggerFactoryOutputPort)
		public readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(PortFinder)
		public readonly portFinder: PortFinder,
		@inject(ServerDrivenTrpcChannelProvider.baseProvider)
		public readonly baseExtensionChannelProvider: HelperBaseExtensionChannelProvider,
	) {
		this.on = this.baseExtensionChannelProvider.on;
	}

	getMessageChannel = (channelId: string) => {
		return this.baseExtensionChannelProvider.getMessageChannel(channelId);
	};

	openChannel = (id: string) => {
		return this.baseExtensionChannelProvider.openChannel(id);
	};

	private static readonly baseProvider = Symbol.for(
		"ServerDrivenTrpcBaseExtensionChannelProvider",
	);

	/**
	 * Setup container bindings for ServerDrivenTrpcChannelProvider and its dependencies
	 */
	static setupContainer(container: Container): void {
		container
			.bind<ExtensionChannelProviderOutputPort>(
				ServerDrivenTrpcChannelProvider.baseProvider,
			)
			.to(HelperBaseExtensionChannelProvider)
			.inTransientScope();

		container.bind<PortFinder>(PortFinder).to(PortFinder);

		// Bind ServerDrivenTrpcChannelProvider
		container
			.bind<ServerDrivenTrpcChannelProvider>(ServerDrivenTrpcChannelProvider)
			.to(ServerDrivenTrpcChannelProvider);
	}
}
