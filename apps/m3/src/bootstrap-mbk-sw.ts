import { createCoreExtensionContainer } from "@mcp-browser-kit/core-extension";
import { MbkSw } from "./services/mbk-sw";

// Create and configure container
const swContainer = createCoreExtensionContainer();

// Register MbkSw and its dependencies
MbkSw.setupContainer(swContainer);

// Resolve and bootstrap MbkSw service
const mbkSw = swContainer.get<MbkSw>(MbkSw);
mbkSw.bootstrap();
