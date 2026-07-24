import { Container } from "inversify";
import { ExtensionTabLifecycle } from "./services";

// Create and configure the dependency injection container for tab context
const containerTab = new Container({
	defaultScope: "Singleton",
});

// Register ExtensionTabLifecycle and its dependencies (includes driver setup)
ExtensionTabLifecycle.setupContainer(containerTab);

// Resolve the ExtensionTabLifecycle service and start it
const extensionTabLifecycle = containerTab.get<ExtensionTabLifecycle>(
	ExtensionTabLifecycle,
);
extensionTabLifecycle.start();
