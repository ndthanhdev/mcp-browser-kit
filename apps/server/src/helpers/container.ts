import { createCoreServerContainer } from "@mcp-browser-kit/core-server";
import {
	ExtensionDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenExtensionDriver } from "@mcp-browser-kit/driven-extension-driver/helpers/driven-extension-driver";
import { DrivenLoggerFactoryConsolaJson } from "@mcp-browser-kit/driven-logger-factory";

export const container = createCoreServerContainer();

container
	.bind<ExtensionDriverOutputPort>(ExtensionDriverOutputPort)
	.to(DrivenExtensionDriver);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaJson);
