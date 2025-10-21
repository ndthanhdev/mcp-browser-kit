import {
	ExtensionChannelProviderOutputPort,
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
import { type Context, createContext } from "../utils/create-context";
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
	private logger: ReturnType<LoggerFactoryOutputPort["create"]>;

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
		this.logger = this.loggerFactory.create("trpcServer");
	}

	getMessageChannel = (channelId: string) => {
		return this.baseExtensionChannelProvider.getMessageChannel(channelId);
	};

	openChannel = (id: string) => {
		return this.baseExtensionChannelProvider.openChannel(id);
	};

	closeChannel = (id: string) => {
		return this.baseExtensionChannelProvider.closeChannel(id);
	};

	public async start() {
		this.logger.verbose("Starting HTTP Server");
		const httpServer = this.createHttpServer();

		this.logger.verbose("Starting WebSocket Server");
		const wss = this.createWebSocketServer(httpServer);

		this.logger.verbose("Applying WebSocket Handler");
		const handler = this.createTrpcHandler(wss);

		this.setupConnectionLogging(wss);

		const port = await this.findPort();

		this.startServer(httpServer, port);

		this.setupShutdownHandlers(httpServer, wss, handler);
	}

	private createHttpServer() {
		return createServer((req, res) => {
			this.setCorsHeaders(res);

			if (req.method === "OPTIONS") {
				return this.handleOptionsRequest(res);
			}

			if (req.method === "GET") {
				return this.handleHealthCheckRequest(res);
			}

			res.writeHead(404);
			res.end();
		});
	}

	private setCorsHeaders(res: import("http").ServerResponse) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	}

	private handleOptionsRequest(res: import("http").ServerResponse) {
		res.writeHead(204);
		res.end();
	}

	private handleHealthCheckRequest(res: import("http").ServerResponse) {
		res.writeHead(200, {
			"Content-Type": "application/json",
		});
		res.end(
			JSON.stringify({
				status: "ok",
				service: "mcp-browser-kit",
			}),
		);
	}

	private createWebSocketServer(httpServer: import("http").Server) {
		return new WebSocketServer({
			server: httpServer,
			verifyClient: () => true, // Allow CORS from any origin
		});
	}

	private createTrpcHandler(wss: WebSocketServer) {
		const rootRouter = createRootRouter(this.container);

		return applyWSSHandler({
			wss,
			router: rootRouter,
			createContext,
			keepAlive: {
				enabled: true,
				pingMs: 25000,
				pongWaitMs: 5000,
			},
		});
	}

	private setupConnectionLogging(wss: WebSocketServer) {
		wss.on("connection", (ws) => {
			this.logger.info(
				`New connection established (${wss.clients.size} total connections)`,
			);
			ws.once("close", () => {
				this.logger.info(
					`Connection closed (${wss.clients.size} total connections)`,
				);
			});
		});
	}

	private async findPort() {
		const port = await this.portFinder.findAvailablePort();
		if (port === null) {
			this.logger.error("No available ports found in the configured range");
			throw new Error("No available ports found");
		}
		return port;
	}

	private startServer(httpServer: import("http").Server, port: number) {
		httpServer.listen(port, () => {
			this.logger.info(`HTTP Server started on http://localhost:${port}`);
			this.logger.info(
				`WebSocket Server started and listening on ws://localhost:${port}`,
			);
		});
	}

	private setupShutdownHandlers(
		httpServer: import("http").Server,
		wss: WebSocketServer,
		handler: ReturnType<typeof applyWSSHandler>,
	) {
		process.on("SIGTERM", () => {
			this.logger.info("SIGTERM received");
			this.shutdown(httpServer, wss, handler);
		});

		process.on("SIGINT", () => {
			this.logger.info("SIGINT received");
			this.shutdown(httpServer, wss, handler);
		});

		process.stdin.on("close", () => {
			this.logger.info("stdin closed");
			this.shutdown(httpServer, wss, handler);
		});
	}

	private shutdown(
		httpServer: import("http").Server,
		wss: WebSocketServer,
		handler: ReturnType<typeof applyWSSHandler>,
	) {
		this.logger.info("Server shutdown initiated");
		handler.broadcastReconnectNotification();
		wss.close(() => {
			this.logger.info("WebSocket Server successfully closed");
			httpServer.close(() => {
				this.logger.info("HTTP Server successfully closed");
				process.exit(0);
			});
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

		// Bind ExtensionChannelProviderOutputPort to the same instance
		container
			.bind<ExtensionChannelProviderOutputPort>(
				ExtensionChannelProviderOutputPort,
			)
			.to(ServerDrivenTrpcChannelProvider);
	}
}
