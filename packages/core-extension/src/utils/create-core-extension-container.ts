import { Container } from "inversify";
import { ExtensionToolsInputPort } from "../input-ports";
import { ExtensionToolsUseCase } from "../use-cases";

export const createCoreExtensionContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container
		.bind<ExtensionToolsInputPort>(ExtensionToolsInputPort)
		.to(ExtensionToolsUseCase);

	return container;
};
