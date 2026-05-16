#!/usr/bin/env node
import {
	LoggerFactoryOutputPort,
	ServerLifecycleInputPort,
} from "@mcp-browser-kit/core-server";
import { container } from "./services/container";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("main");
const lifecycle = container.get<ServerLifecycleInputPort>(
	ServerLifecycleInputPort,
);

let shuttingDown = false;
const shutdown = async (signal: string) => {
	if (shuttingDown) return;
	shuttingDown = true;
	logger.info(`Shutdown signal received: ${signal}`);
	try {
		await lifecycle.stop();
		process.exit(0);
	} catch (err) {
		logger.error("Error during shutdown", err);
		process.exit(1);
	}
};

process.on("SIGTERM", () => {
	void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
	void shutdown("SIGINT");
});
process.stdin.on("close", () => {
	void shutdown("stdin-close");
});
process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

await lifecycle.start();
