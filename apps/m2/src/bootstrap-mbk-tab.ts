import { Container } from "inversify";
import { MbkTab } from "./services";

// Create and configure the dependency injection container for tab context
const containerTab = new Container({
	defaultScope: "Singleton",
});

// Register MbkTab and its dependencies (includes driver setup)
MbkTab.setupContainer(containerTab);

// Resolve the MbkTab service and bootstrap
const mbkTab = containerTab.get<MbkTab>(MbkTab);
mbkTab.bootstrap();
