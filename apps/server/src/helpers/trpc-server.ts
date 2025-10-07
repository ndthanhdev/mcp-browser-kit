import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { PortFinder } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { rootRouter } from "../routers/root";
import { container } from "./container";
import { createContext } from "./create-context";

export const startTrpcServer = async () => {
	const logger = container
		.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
		.create("trpcServer");

	const portFinder = container.get<PortFinder>(PortFinder);

	logger.verbose("Starting HTTP Server");
	// Create HTTP server for health checks and WebSocket upgrade
	const httpServer = createServer((req, res) => {
		// Set CORS headers for all requests
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

		// Handle OPTIONS preflight
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		// Handle health check / discovery requests
		if (req.method === "GET") {
			res.writeHead(200, {
				"Content-Type": "application/json",
			});
			res.end(
				JSON.stringify({
					status: "ok",
					service: "mcp-browser-kit",
				}),
			);
			return;
		}

		res.writeHead(404);
		res.end();
	});

	logger.verbose("Starting WebSocket Server");
	const wss = new WebSocketServer({
		server: httpServer,
		verifyClient: () => true, // Allow CORS from any origin
	});

	logger.verbose("Applying WebSocket Handler");
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

	// Find an available port
	const port = await portFinder.findAvailablePort();
	if (port === null) {
		logger.error("No available ports found in the configured range");
		throw new Error("No available ports found");
	}

	// Start the HTTP server
	httpServer.listen(port, () => {
		logger.info(`HTTP Server started on http://localhost:${port}`);
		logger.info(
			`WebSocket Server started and listening on ws://localhost:${port}`,
		);
	});

	const shutdown = () => {
		logger.info("Server shutdown initiated");
		handler.broadcastReconnectNotification();
		wss.close(() => {
			logger.info("WebSocket Server successfully closed");
			httpServer.close(() => {
				logger.info("HTTP Server successfully closed");
				process.exit(0);
			});
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
