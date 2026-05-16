import type { Container } from "inversify";
import { router } from "../services/server-driven-trpc-channel-provider";
import { createDeferRouter } from "./defer";
import { createEventsRouter } from "./events";

// Create a factory function that accepts the container
export const createRootRouter = (container: Container) => {
	const defer = createDeferRouter(container);
	const events = createEventsRouter(container);

	return router({
		defer,
		events,
	});
};

// Export type router type signature based on the factory
export type RootRouter = ReturnType<typeof createRootRouter>;
