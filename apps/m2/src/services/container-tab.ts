import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { Container } from "inversify";
import { MbkTab } from "./mbk-tab";

// Create and configure the dependency injection container for tab context
export const containerTab = new Container({
	defaultScope: "Singleton",
});

// Bind logger factory first (required by other services)
containerTab
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Register MbkTab and its dependencies (includes driver setup)
MbkTab.setupContainer(containerTab);
