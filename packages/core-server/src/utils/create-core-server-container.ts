import { Container } from "inversify";
import {
	BrowserStateRegistry,
	ExtensionChannelManager,
	McpDescriptionsUseCases,
	ObserveBrowserStateUseCases,
	ServerLifecycle,
	SnapshotContentUseCases,
	ToolCallUseCases,
} from "../core";
import {
	McpDescriptionsInputPort,
	ObserveBrowserStateInputPort,
	ServerLifecycleInputPort,
	ServerToolCallsInputPort,
	SnapshotContentInputPort,
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
		.bind<McpDescriptionsInputPort>(McpDescriptionsInputPort)
		.to(McpDescriptionsUseCases);
	container
		.bind<SnapshotContentInputPort>(SnapshotContentInputPort)
		.to(SnapshotContentUseCases);
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
