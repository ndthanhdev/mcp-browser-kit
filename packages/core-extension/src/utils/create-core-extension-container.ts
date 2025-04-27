import { Container } from "inversify";
import type { ExtensionToolCallsInputPort } from "../input-ports";
import { ExtensionToolsUseCase } from "../use-cases";

export const createCoreExtensionContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container
		.bind<ExtensionToolCallsInputPort>(ExtensionToolsInputPort)
		.to(ExtensionToolsUseCase);

	return container;
};
