import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { rootRouter } from "../routers/root";
import { createContext } from "./create-context";

export const startTRpcServer = () => {
	const wss = new WebSocketServer({
		port: 59089,
	});

	const handler = applyWSSHandler({
		wss,
		router: rootRouter,
		createContext,
		// Enable heartbeat messages to keep connection open (disabled by default)
		keepAlive: {
			enabled: true,
			// server ping message interval in milliseconds
			pingMs: 30000,
			// connection is terminated if pong message is not received in this many milliseconds
			pongWaitMs: 5000,
		},
	});

	wss.on("connection", (ws) => {
		// console.log(`➕➕ Connection (${wss.clients.size})`);
		ws.once("close", () => {
			// console.log(`➖➖ Connection (${wss.clients.size})`);
		});
	});
	// console.log("✅ WebSocket Server listening on ws://localhost:59089");
	const shutdown = () => {
		handler.broadcastReconnectNotification();
		wss.close(() => {
			process.exit(0);
		});
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
	process.stdin.on("close", shutdown);
};
