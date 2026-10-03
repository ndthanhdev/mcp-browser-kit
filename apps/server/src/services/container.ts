import {
	createCoreServerContainer,
	FeatureFlagsOutputPort,
	LifecycleParticipantOutputPort,
	LoggerFactoryOutputPort,
	ServerInfoOutputPort,
} from "@mcp-browser-kit/core-server";
import { DrivenFeatureFlagsOpenFeatureServer } from "@mcp-browser-kit/driven-feature-flags/server";
import { DrivenLoggerFactoryConsolaError } from "@mcp-browser-kit/driven-logger-factory";
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { ServerDrivingMcpServer } from "@mcp-browser-kit/server-driving-mcp-server";

export const container = createCoreServerContainer();

container.bind<ServerInfoOutputPort>(ServerInfoOutputPort).toConstantValue({
	// Undefined when run from source without the tsup build.
	serverVersion:
		typeof __MBK_SERVER_VERSION__ === "string"
			? __MBK_SERVER_VERSION__
			: "0.0.0",
});

DrivenLoggerFactoryConsolaError.setupContainer(
	container,
	LoggerFactoryOutputPort,
);

DrivenFeatureFlagsOpenFeatureServer.setupContainer(
	container,
	FeatureFlagsOutputPort,
	LifecycleParticipantOutputPort,
);

ServerDrivenTrpcChannelProvider.setupContainer(container);

ServerDrivingMcpServer.setupContainer(container);
