import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { DrivenBrowserDriverM2 } from "@mcp-browser-kit/extension-driven-browser-driver";
import { Container } from "inversify";
import { MbkTab } from "./mbk-tab";

// Create and configure the dependency injection container for tab context
export const containerTab = new Container({
	defaultScope: "Singleton",
});

// Setup M2 container with all required services
DrivenBrowserDriverM2.setupContainer(containerTab);

// Bind logger factory
containerTab
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Register MbkTab and its dependencies
MbkTab.setupContainer(containerTab);
