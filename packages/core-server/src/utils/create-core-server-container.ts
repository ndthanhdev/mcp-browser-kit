import { Container } from "inversify";
import { RpcCallInputPort } from "../input-ports";
import { RpcCallUseCase } from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<RpcCallInputPort>(RpcCallInputPort).to(RpcCallUseCase);

	return container;
};
