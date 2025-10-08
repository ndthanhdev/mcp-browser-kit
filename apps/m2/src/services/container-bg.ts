import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { MbkBg } from "./mbk-bg";

export const containerBg = createCoreExtensionContainer();

containerBg
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM2);

containerBg
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Setup server channel provider with discoverer
ExtensionDrivenServerChannelProvider.setupContainer(containerBg);

// Register MbkBg service
containerBg.bind<MbkBg>(MbkBg).to(MbkBg);
