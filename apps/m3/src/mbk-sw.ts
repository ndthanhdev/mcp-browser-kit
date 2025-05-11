import {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import type { DrivenBrowserDriverM3 } from "@mcp-browser-kit/driven-browser-driver";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	wsLink,
} from "@trpc/client";
import { container } from "./helpers/container";
import { createSwRpcServer } from "./helpers/create-sw-rpc-server";
import { startListenKeepAlive } from "./helpers/keep-alive";

const driverM3 = container.get<BrowserDriverOutputPort>(
	BrowserDriverOutputPort,
) as DrivenBrowserDriverM3;
driverM3.linkRpc();

// create persistent WebSocket connection
const wsClient = createWSClient({
	url: "ws://localhost:59089",
});

const trpc = createTRPCClient<RootRouter>({
	links: [
		loggerLink(),
		wsLink({
			client: wsClient,
		}),
	],
});
const swRpcServer = createSwRpcServer();

const deferLogger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("trp", "defer");

trpc.defer.onMessage.subscribe(undefined, {
	onData: async (data) => {
		deferLogger.info("defer", data);
		const message = await swRpcServer.handleDefer(data);
		deferLogger.info("resolve", message);
		trpc.defer.resolve.mutate(message);
	},
});
startListenKeepAlive();
