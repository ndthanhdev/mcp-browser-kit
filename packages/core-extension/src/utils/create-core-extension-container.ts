import { Container } from "inversify";
import { PublishBrowserStateUseCase, ToolCallHandlersUseCase } from "../core";
import {
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

	return container;
};
