import { Container } from "inversify";
import {
	ExtensionBootstrapUseCase,
	PublishBrowserStateUseCase,
	ToolCallHandlersUseCase,
} from "../core";
import {
	ExtensionBootstrapInputPort,
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
		.bind<ExtensionBootstrapInputPort>(ExtensionBootstrapInputPort)
		.to(ExtensionBootstrapUseCase);

	return container;
};
