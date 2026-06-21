import { createCoreExtensionContainer } from "@mcp-browser-kit/core-extension";
import { ExtensionBootstrap } from "./services/extension-bootstrap";

// Create and configure container
const swContainer = createCoreExtensionContainer();

// Register ExtensionBootstrap and its dependencies
ExtensionBootstrap.setupContainer(swContainer);

// Resolve and bootstrap ExtensionBootstrap service
const extensionBootstrap =
	swContainer.get<ExtensionBootstrap>(ExtensionBootstrap);
extensionBootstrap.bootstrap();
