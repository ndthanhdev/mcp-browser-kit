import { Container } from "inversify";
import { ExtensionTabBootstrap } from "./services";

// Create and configure the dependency injection container for tab context
const containerTab = new Container({
	defaultScope: "Singleton",
});

// Register ExtensionTabBootstrap and its dependencies (includes driver setup)
ExtensionTabBootstrap.setupContainer(containerTab);

// Resolve the ExtensionTabBootstrap service and bootstrap
const extensionTabBootstrap = containerTab.get<ExtensionTabBootstrap>(
	ExtensionTabBootstrap,
);
extensionTabBootstrap.bootstrap();
