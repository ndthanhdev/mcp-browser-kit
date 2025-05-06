import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { rootRouter } from "../routers/root";
import { container } from "./container";
import { createContext } from "./create-context";

export const startTrpcServer = () => {
	const logger = container
		.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
		.create("trpcServer");

	const wss = new WebSocketServer({
		port: 59089,
	});

	const handler = applyWSSHandler({
		wss,
		router: rootRouter,
		createContext,
		keepAlive: {
			enabled: true,
			pingMs: 25000,
			pongWaitMs: 5000,
		},
	});

	wss.on("connection", (ws) => {
		logger.info(
			`New connection established (${wss.clients.size} total connections)`,
		);
		ws.once("close", () => {
			logger.info(`Connection closed (${wss.clients.size} total connections)`);
		});
	});

	logger.info("WebSocket Server started and listening on ws://localhost:59089");

	const shutdown = () => {
		logger.info("Server shutdown initiated");
		handler.broadcastReconnectNotification();
		wss.close(() => {
			logger.info("WebSocket Server successfully closed");
			process.exit(0);
		});
	};

	process.on("SIGTERM", () => {
		logger.info("SIGTERM received");
		shutdown();
	});

	process.on("SIGINT", () => {
		logger.info("SIGINT received");
		shutdown();
	});

	process.stdin.on("close", () => {
		logger.info("stdin closed");
		shutdown();
	});
};
