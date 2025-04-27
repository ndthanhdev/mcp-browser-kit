import { Container } from "inversify";
import { ToolCallsInputPort } from "../input-ports";
import { RpcCallUseCase } from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<ToolCallsInputPort>(ToolCallsInputPort).to(RpcCallUseCase);

	return container;
};
