import {
	createCoreExtensionContainer,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { DrivenLoggerFactoryConsolaBrowser } from "@mcp-browser-kit/driven-logger-factory";
import { MbkTab } from "./services/mbk-tab";

// Create and configure container
const tabContainer = createCoreExtensionContainer();

// driven services
tabContainer
	.bind<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.to(DrivenLoggerFactoryConsolaBrowser);

// Setup MbkTab service (includes browser driver setup)
MbkTab.setupContainer(tabContainer);

// Resolve and bootstrap MbkTab service
const mbkTab = tabContainer.get<MbkTab>(MbkTab);
mbkTab.bootstrap();
