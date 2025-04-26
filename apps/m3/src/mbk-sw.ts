import browser from "webextension-polyfill";
import { container } from "./helpers/container";
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	wsLink,
} from "@trpc/client";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import { DrivenBrowserDriverM3 } from "@mcp-browser-kit/driven-browser-driver";
import { BrowserDriverOutputPort } from "@mcp-browser-kit/core-extension";
import { createSwRpcServer } from "./helpers/create-sw-rpc-server";

browser.alarms.create("keepAlive", { periodInMinutes: 1 });
browser.alarms.onAlarm.addListener((info) => {
	if (info.name === "keepAlive") {
		// Perform some trivial operation to keep the service worker alive
		browser.runtime.getPlatformInfo();
		console.log("Service worker alive");
	}
});

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriverM3);

// const rpcServer = createRpcServer();

// create persistent WebSocket connection
const wsClient = createWSClient({
	url: "ws://localhost:59089",
});

// const rpcServer = createRpcServer();

const trpc = createTRPCClient<RootRouter>({
	links: [
		loggerLink(),
		wsLink({
			client: wsClient,
		}),
	],
});
const swRpcServer = createSwRpcServer();
trpc.defer.onMessage.subscribe(undefined, {
	onData: async (data) => {
		console.log("defer", data);
		const message = await swRpcServer.handleDefer(data);
		console.log("resolve", message);

		trpc.defer.resolve.mutate(message);
	},
});
