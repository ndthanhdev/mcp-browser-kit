import { Container } from "inversify";
import {
	BrowserAgentUseCase,
	ExtensionLifecycleUseCase,
	PublishBrowserStateUseCase,
	ToolCallHandlersUseCase,
} from "../core";
import {
	BrowserAgentInputPort,
	ExtensionLifecycleInputPort,
	ExtensionToolCallInputPort,
	PublishBrowserStateInputPort,
} from "../input-ports";

export const createCoreExtensionContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container
		.bind<ExtensionToolCallInputPort>(ExtensionToolCallInputPort)
		.to(ToolCallHandlersUseCase);

	container
		.bind<PublishBrowserStateInputPort>(PublishBrowserStateInputPort)
		.to(PublishBrowserStateUseCase);

	container
		.bind<ExtensionLifecycleInputPort>(ExtensionLifecycleInputPort)
		.to(ExtensionLifecycleUseCase);

	container
		.bind<BrowserAgentInputPort>(BrowserAgentInputPort)
		.to(BrowserAgentUseCase);

	return container;
};
