#!/usr/bin/env node
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { container } from "./services/container";
import { startMcpServer } from "./services/mcp-server";

const trpcServer = container.get<ServerDrivenTrpcChannelProvider>(
	ServerDrivenTrpcChannelProvider,
);
await trpcServer.start();
startMcpServer();
