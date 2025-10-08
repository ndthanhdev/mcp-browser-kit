import {
	type ExtensionChannelProviderOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-server";
import { HelperBaseExtensionChannelProvider } from "@mcp-browser-kit/helper-base-extension-channel-provider";
import { initTRPC } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createServer } from "http";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";
import { WebSocketServer } from "ws";
import { createRootRouter } from "../routers/root";
import { type Context, createContext } from "./create-context";
import { PortFinder } from "./port-finder";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

@injectable()
export class ServerDrivenTrpcChannelProvider
	implements ExtensionChannelProviderOutputPort
{
	public readonly on: ExtensionChannelProviderOutputPort["on"];
	private container: Container;

	constructor(
		@inject(LoggerFactoryOutputPort)
		public readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(PortFinder)
		public readonly portFinder: PortFinder,
		@inject(ServerDrivenTrpcChannelProvider.baseProvider)
		public readonly baseExtensionChannelProvider: HelperBaseExtensionChannelProvider,
		@inject(ServerDrivenTrpcChannelProvider.containerSymbol)
		container: Container,
	) {
		this.on = this.baseExtensionChannelProvider.on;
		this.container = container;
	}

	getMessageChannel = (channelId: string) => {
		return this.baseExtensionChannelProvider.getMessageChannel(channelId);
	};

	openChannel = (id: string) => {
		return this.baseExtensionChannelProvider.openChannel(id);
	};

	public async start() {
		const logger = this.loggerFactory.create("trpcServer");

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

		// Create the router with the container
		const rootRouter = createRootRouter(this.container);

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
				logger.info(
					`Connection closed (${wss.clients.size} total connections)`,
				);
			});
		});

		// Find an available port
		const port = await this.portFinder.findAvailablePort();
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
	}

	private static readonly baseProvider = Symbol.for(
		"ServerDrivenTrpcBaseExtensionChannelProvider",
	);

	private static readonly containerSymbol = Symbol.for(
		"ServerDrivenTrpcContainer",
	);

	/**
	 * Setup container bindings for ServerDrivenTrpcChannelProvider and its dependencies
	 */
	static setupContainer(container: Container): void {
		container
			.bind<ExtensionChannelProviderOutputPort>(
				ServerDrivenTrpcChannelProvider.baseProvider,
			)
			.to(HelperBaseExtensionChannelProvider)
			.inTransientScope();

		container.bind<PortFinder>(PortFinder).to(PortFinder);

		// Bind the container itself so routers can access it
		container
			.bind<Container>(ServerDrivenTrpcChannelProvider.containerSymbol)
			.toConstantValue(container);

		// Bind ServerDrivenTrpcChannelProvider
		container
			.bind<ServerDrivenTrpcChannelProvider>(ServerDrivenTrpcChannelProvider)
			.to(ServerDrivenTrpcChannelProvider);
	}
}
