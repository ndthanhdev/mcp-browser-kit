import { Container } from "inversify";
import { MbkTab } from "./services/mbk-tab";

// Create and configure the dependency injection container for tab context
const tabContainer = new Container({
	defaultScope: "Singleton",
});

// Setup MbkTab service (includes browser driver setup)
MbkTab.setupContainer(tabContainer);

// Resolve and bootstrap MbkTab service
const mbkTab = tabContainer.get<MbkTab>(MbkTab);
mbkTab.bootstrap();
