import "core-js/proposals";
import { createCoreExtensionContainer } from "@mcp-browser-kit/core-extension";
import { ExtensionBootstrap } from "./services";

// Create and configure the dependency injection container for background context
const containerBg = createCoreExtensionContainer();

// Register ExtensionBootstrap and its dependencies
ExtensionBootstrap.setupContainer(containerBg);

// Resolve the ExtensionBootstrap service and bootstrap
const extensionBootstrap =
	containerBg.get<ExtensionBootstrap>(ExtensionBootstrap);
extensionBootstrap.bootstrap();
