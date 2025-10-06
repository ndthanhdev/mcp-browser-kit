import {
	createCoreServerContainer,
	ExtensionDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { ExtensionChannelProviderOutputPort } from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import { DrivenExtensionDriver } from "@mcp-browser-kit/driven-extension-driver/helpers/driven-extension-driver";
import { DrivenLoggerFactoryConsolaJson } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenExtensionChannelProvider } from "@mcp-browser-kit/server-driven-extension-channel-provider";

const container = createCoreServerContainer();

container
	.bind<ExtensionDriverOutputPort>(ExtensionDriverOutputPort)
	.to(DrivenExtensionDriver);

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaJson);

container
	.bind<ExtensionChannelProviderOutputPort>(ExtensionChannelProviderOutputPort)
	.to(ServerDrivenExtensionChannelProvider);

export { container };
