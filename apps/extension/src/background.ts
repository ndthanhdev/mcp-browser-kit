import "core-js/proposals"
import {
	createTRPCClient,
	createWSClient,
	loggerLink,
	wsLink,
} from "@trpc/client";
import type { RootRouter } from "@mcp-browser-kit/server/routers/root";
import { rpcServer } from "./helpers/rpc-server";
import { addDevTool } from "./utils/add-dev-tool";

// create persistent WebSocket connection
const wsClient = createWSClient({
	url: `ws://localhost:59089`,
});

const trpc = createTRPCClient<RootRouter>({
	links: [
		loggerLink(),
		wsLink({
			client: wsClient,
		}),
	],
});

addDevTool({
	trpc,
});

trpc.defer.onMessage.subscribe(undefined, {
	onData: async (data) => {
		console.log("defer", data);
		const message = await rpcServer.handleDefer(data);
		console.log("resolve", message);

		trpc.defer.resolve.mutate(message);
	},
});
