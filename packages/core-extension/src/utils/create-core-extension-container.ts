import { Container } from "inversify";
import { ManageChannelUseCases, ToolCallHandlersUseCase } from "../core";
import {
	ExtensionToolCallInputPort,
	ManageChannelsInputPort,
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

	return container;
};
