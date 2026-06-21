import { Container } from "inversify";
import { ExtensionTabBootstrap } from "./services/extension-tab-bootstrap";

// Create and configure the dependency injection container for tab context
const tabContainer = new Container({
	defaultScope: "Singleton",
});

// Setup ExtensionTabBootstrap service (includes browser driver setup)
ExtensionTabBootstrap.setupContainer(tabContainer);

// Resolve and bootstrap ExtensionTabBootstrap service
const extensionTabBootstrap = tabContainer.get<ExtensionTabBootstrap>(
	ExtensionTabBootstrap,
);
extensionTabBootstrap.bootstrap();
