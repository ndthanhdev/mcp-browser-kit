import { Container } from "inversify";
import {
	BrowserStateRegistry,
	ExtensionChannelManager,
	ObserveBrowserStateUseCases,
	ServerLifecycle,
	ToolCallUseCases,
	ToolDescriptionsUseCases,
} from "../core";
import {
	ObserveBrowserStateInputPort,
	ServerLifecycleInputPort,
	ServerToolCallsInputPort,
	ToolDescriptionsInputPort,
} from "../input-ports";
import { LifecycleParticipantOutputPort } from "../output-ports";

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
	container.bind<ExtensionChannelManager>(ExtensionChannelManager).toSelf();
	container.bind<BrowserStateRegistry>(BrowserStateRegistry).toSelf();
	container
		.bind<ObserveBrowserStateInputPort>(ObserveBrowserStateInputPort)
		.to(ObserveBrowserStateUseCases);
	// Lifecycle orchestration. Participants register themselves (in order)
	// via their own setupContainer; BrowserStateRegistry is a core participant
	// and is registered here first so it always starts before any adapters.
	container
		.bind<ServerLifecycleInputPort>(ServerLifecycleInputPort)
		.to(ServerLifecycle);
	container
		.bind<LifecycleParticipantOutputPort>(LifecycleParticipantOutputPort)
		.toService(BrowserStateRegistry);

	return container;
};
