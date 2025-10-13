import {
	createCoreServerContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenLoggerFactoryConsolaError } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";

const container = createCoreServerContainer();

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaError);

// Setup ServerDrivenTrpcChannelProvider and its dependencies
ServerDrivenTrpcChannelProvider.setupContainer(container);

export { container };
