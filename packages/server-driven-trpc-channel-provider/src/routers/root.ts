import type { Container } from "inversify";
import { router } from "../services/server-driven-trpc-channel-provider";
import { createDeferRouter } from "./defer";

// Create a factory function that accepts the container
export const createRootRouter = (container: Container) => {
	const defer = createDeferRouter(container);

	return router({
		defer,
	});
};

// Export type router type signature based on the factory
export type RootRouter = ReturnType<typeof createRootRouter>;
