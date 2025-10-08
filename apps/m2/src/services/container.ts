import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { KeepAlive } from "./keep-alive";

export const container = createCoreExtensionContainer();

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM2);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Setup server channel provider with discoverer
ExtensionDrivenServerChannelProvider.setupContainer(container);

// Register KeepAlive service
container.bind<KeepAlive>(KeepAlive).to(KeepAlive);
