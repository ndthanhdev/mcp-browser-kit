import { Container } from "inversify";
import { ToolCallsInputPort, ToolDescriptionsInputPort } from "../input-ports";
import { ToolCallUseCases, ToolDescriptionsUseCases } from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<ToolCallsInputPort>(ToolCallsInputPort).to(ToolCallUseCases);
	container
		.bind<ToolDescriptionsInputPort>(ToolDescriptionsInputPort)
		.to(ToolDescriptionsUseCases);

	return container;
};
