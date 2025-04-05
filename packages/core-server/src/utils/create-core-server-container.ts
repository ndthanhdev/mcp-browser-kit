import { Container } from "inversify";
import { ToolsInputPort } from "../input-ports";
import { RpcCallUseCase } from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<ToolsInputPort>(ToolsInputPort).to(RpcCallUseCase);

	return container;
};
