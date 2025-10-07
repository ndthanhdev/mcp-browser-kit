import {
	createCoreServerContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { ExtensionChannelProviderOutputPort } from "@mcp-browser-kit/core-server/output-ports/extension-channel-provider";
import { DrivenLoggerFactoryConsolaJson } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenExtensionChannelProvider } from "@mcp-browser-kit/server-driven-extension-channel-provider";
import { ServerDrivingTrpcController } from "@mcp-browser-kit/server-driving-trpc-controller";

const container = createCoreServerContainer();

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaJson);

container
	.bind<ExtensionChannelProviderOutputPort>(ExtensionChannelProviderOutputPort)
	.to(ServerDrivenExtensionChannelProvider);

// Setup ServerDrivingTrpcController and its dependencies
ServerDrivingTrpcController.setupContainer(container);

export { container };
