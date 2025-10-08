import { containerTab, MbkTab } from "./services";

// Resolve the MbkTab service and bootstrap
const mbkTab = containerTab.get<MbkTab>(MbkTab);
mbkTab.bootstrap();
