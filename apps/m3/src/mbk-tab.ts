import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import {
	DrivenBrowserDriverM3,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { Container } from "inversify";
import { startKeepAlive } from "./services/keep-alive";

// Create and configure the dependency injection container
const container = new Container({
	defaultScope: "Singleton",
});

// Register logger factory
container
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Setup M3 container with required services
DrivenBrowserDriverM3.setupContainer(container);

// Resolve dependencies and start services
const tabToolsSetup = container.get<TabToolsSetup>(TabToolsSetup);

// Set up tab tools in global scope using the instance
tabToolsSetup.setUpTabTools();

// Start listening for browser runtime messages
tabToolsSetup.startListen();

startKeepAlive();
