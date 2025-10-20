import "core-js/proposals";
import { createCoreExtensionContainer } from "@mcp-browser-kit/core-extension";
import { MbkBg } from "./services";

// Create and configure the dependency injection container for background context
const containerBg = createCoreExtensionContainer();

// Register MbkBg and its dependencies
MbkBg.setupContainer(containerBg);

// Resolve the MbkBg service and bootstrap
const mbkBg = containerBg.get<MbkBg>(MbkBg);
mbkBg.bootstrap();
