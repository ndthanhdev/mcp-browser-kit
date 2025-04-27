import { Container } from "inversify";
import { ExtensionToolCallsInputPort } from "../input-ports";
import { ExtensionToolsUseCase } from "../use-cases";

export const createCoreExtensionContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container
		.bind<ExtensionToolCallsInputPort>(ExtensionToolCallsInputPort)
		.to(ExtensionToolsUseCase);

	return container;
};
