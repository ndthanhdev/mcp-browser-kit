import { Container } from "inversify";
import { ToolCallUseCases, ToolDescriptionsUseCases } from "../core";
import {
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "../input-ports";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container
		.bind<ServerToolCallsInputPort>(ServerToolCallsInputPort)
		.to(ToolCallUseCases);
	container
		.bind<ToolDescriptionsInputPort>(ToolDescriptionsInputPort)
		.to(ToolDescriptionsUseCases);

	return container;
};
