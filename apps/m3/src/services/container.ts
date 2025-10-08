import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	DrivenBrowserDriverM3,
	TabRpcService,
} from "@mcp-browser-kit/extension-driven-browser-driver";
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

// Setup server channel provider with discoverer
ExtensionDrivenServerChannelProvider.setupContainer(container);

// special services
container
	.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.to(ExtensionDrivingTrpcController);
