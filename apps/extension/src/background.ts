import "core-js/proposals";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	wsLink,
} from "@trpc/client";
import { container } from "./helpers/container";
import { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension";
import { DrivenBrowserDriver } from "@mcp-browser-kit/driven-browser-driver";
import { createRpcServer } from "./helpers/create-rpc-server";

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriver);

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
		console.log("defer", data);
		const message = await rpcServer.handleDefer(data);
		console.log("resolve", message);

		trpc.defer.resolve.mutate(message);
	},
});
