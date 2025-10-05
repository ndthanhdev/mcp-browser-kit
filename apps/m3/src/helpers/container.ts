import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import {
	DrivenBrowserDriverM3,
	TabRpcService,
} from "@mcp-browser-kit/driven-browser-driver";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";

export const container = createCoreExtensionContainer();

// driven services
container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);
container.bind<TabRpcService>(TabRpcService).to(TabRpcService);
container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM3);
container
	.bind<ServerChannelProviderOutputPort>(ServerChannelProviderOutputPort)
	.to(ExtensionDrivenServerChannelProvider);

// special services
container
	.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.to(ExtensionDrivingTrpcController);
