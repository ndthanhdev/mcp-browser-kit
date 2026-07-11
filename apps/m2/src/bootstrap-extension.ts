import "core-js/proposals";
import {
	createCoreExtensionContainer,
	FeatureFlagsOutputPort,
	LoggerFactoryOutputPort,
	ServerChannelProviderOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenFeatureFlagsOpenFeatureWeb } from "@mcp-browser-kit/driven-feature-flags/web";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserStateSource } from "@mcp-browser-kit/extension-driven-browser-driver";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver/m2";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionBootstrap } from "@mcp-browser-kit/extension-driving-bootstrap";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";

// Create the dependency injection container for the background context.
const container = createCoreExtensionContainer();

// Wire up driven adapters (M2-specific browser driver).
DrivenLoggerFactoryConsolaBrowser.setupContainer(
	container,
	LoggerFactoryOutputPort,
);
DrivenFeatureFlagsOpenFeatureWeb.setupContainer(
	container,
	FeatureFlagsOutputPort,
);
DrivenBrowserDriverM2.setupContainer(container);
DrivenBrowserStateSource.setupContainer(container);
ExtensionDrivenServerChannelProvider.setupContainer(container);

// Wire up driving adapters.
container
	.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.to(ExtensionDrivingTrpcController);
ExtensionBootstrap.setupContainer(container);

// Connect the tRPC controller to the server channel provider (adapter wiring).
const serverProvider = container.get<ServerChannelProviderOutputPort>(
	ServerChannelProviderOutputPort,
);
container
	.get<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.listenToServerChannelEvents(serverProvider);

// Resolve the bootstrap driving component and start the extension.
container.get<ExtensionBootstrap>(ExtensionBootstrap).bootstrap();
