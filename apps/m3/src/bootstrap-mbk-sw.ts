import {
	BrowserDriverOutputPort,
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	DrivenBrowserDriverM3,
	TabRpcService,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { ExtensionDrivenServerChannelProvider } from "@mcp-browser-kit/extension-driven-server-channel-provider";
import { ExtensionDrivingTrpcController } from "@mcp-browser-kit/extension-driving-trpc-controller";
import { MbkSw } from "./services/mbk-sw";

// Create and configure container
const swContainer = createCoreExtensionContainer();

// driven services
swContainer
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);
swContainer.bind<TabRpcService>(TabRpcService).to(TabRpcService);
swContainer
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM3);

// Setup server channel provider with discoverer
ExtensionDrivenServerChannelProvider.setupContainer(swContainer);

// Setup TRPC controller
swContainer
	.bind<ExtensionDrivingTrpcController>(ExtensionDrivingTrpcController)
	.to(ExtensionDrivingTrpcController);

// Register MbkSw service
swContainer.bind<MbkSw>(MbkSw).to(MbkSw);

// Resolve and bootstrap MbkSw service
const mbkSw = swContainer.get<MbkSw>(MbkSw);
mbkSw.bootstrap();
