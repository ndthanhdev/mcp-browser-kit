import {
	DrivenBrowserDriverM2,
	TabToolsSetup,
} from "@mcp-browser-kit/extension-driven-browser-driver";
import { Container } from "inversify";
import { startKeepAlive } from "./helpers/keep-alive";

// Create and configure the dependency injection container
const container = new Container({
	defaultScope: "Singleton",
});

// Setup M2 container with all required services
DrivenBrowserDriverM2.setupContainer(container);

// Resolve dependencies and start services
const tabToolsSetup = container.get<TabToolsSetup>(TabToolsSetup);

// Set up tab tools in global scope using the instance
tabToolsSetup.setUpTabTools();

// Start listening for browser runtime messages
tabToolsSetup.startListen();

startKeepAlive();
