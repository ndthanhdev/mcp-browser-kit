import "core-js/proposals";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	wsLink,
} from "@trpc/client";
import { container } from "./helpers/container";
import { createRpcServer } from "./helpers/create-rpc-server";

const deferLogger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("trp", "defer");

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

const rpcServer = createRpcServer();

trpc.defer.onMessage.subscribe(undefined, {
	onData: async (data) => {
		deferLogger.info("defer", data);
		const message = await rpcServer.handleDefer(data);
		deferLogger.info("resolve", message);

		trpc.defer.resolve.mutate(message);
	},
});
