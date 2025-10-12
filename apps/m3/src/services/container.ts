import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/extension-driven-browser-driver";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";

export const container = createCoreExtensionContainer();

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM3);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Setup server channel provider with discoverer
ExtensionDrivenServerChannelProvider.setupContainer(container);

// Setup extension driving TRPC controller
container
	.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.to(ExtensionDrivingTrpcController);

// Register KeepAlive service
container.bind<KeepAlive>(KeepAlive).to(KeepAlive);
