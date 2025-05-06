import { createCoreExtensionContainer } from "@mcp-browser-kit/core-extension";
import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/driven-browser-driver";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";

export const container = createCoreExtensionContainer();
container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM3);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);
