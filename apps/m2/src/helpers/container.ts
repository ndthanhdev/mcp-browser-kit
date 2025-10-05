import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/driven-browser-driver";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";

export const container = createCoreExtensionContainer();

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM2);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

container
	.bind<ServerChannelProviderOutputPort>(ServerChannelProviderOutputPort)
	.to(ExtensionDrivenServerChannelProvider);
