import { Container } from "inversify";
import {
	ManageChannelUseCases,
	PublishBrowserStateUseCase,
	ToolCallHandlersUseCase,
} from "../core";
import {
	ExtensionToolCallInputPort,
	ManageChannelsInputPort,
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
		.bind<ManageChannelsInputPort>(ManageChannelsInputPort)
		.to(ManageChannelUseCases);

	container
		.bind<PublishBrowserStateInputPort>(PublishBrowserStateInputPort)
		.to(PublishBrowserStateUseCase);

	return container;
};
