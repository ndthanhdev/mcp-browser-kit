import { Container } from "inversify";
import { GetTabsInputPort } from "../input-ports/get-tabs";
import { GetTabsUseCase } from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<GetTabsInputPort>(GetTabsInputPort).to(GetTabsUseCase);

	return container;
};
