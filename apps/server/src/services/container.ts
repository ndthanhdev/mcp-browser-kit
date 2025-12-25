import {
	createCoreServerContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenLoggerFactoryConsolaError } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { ServerDrivingMcpServer } from "@mcp-browser-kit/server-driving-mcp-server";

export const container = createCoreServerContainer();

container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaError);

ServerDrivenTrpcChannelProvider.setupContainer(container);

ServerDrivingMcpServer.setupContainer(container);
