import { Container } from "inversify";
import { ExtensionTabLifecycle } from "./services/extension-tab-lifecycle";

// Create and configure the dependency injection container for tab context
const tabContainer = new Container({
	defaultScope: "Singleton",
});

// Setup ExtensionTabLifecycle service (includes browser driver setup)
ExtensionTabLifecycle.setupContainer(tabContainer);

// Resolve and start ExtensionTabLifecycle service
const extensionTabLifecycle = tabContainer.get<ExtensionTabLifecycle>(
	ExtensionTabLifecycle,
);
extensionTabLifecycle.start();
