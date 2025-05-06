import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
	createCoreExtensionContainer,
} from "@mcp-browser-kit/core-extension";
import { DrivenBrowserDriver } from "@mcp-browser-kit/driven-browser-driver";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";

export const container = createCoreExtensionContainer();

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriver);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);
