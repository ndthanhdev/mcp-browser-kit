#!/usr/bin/env node
import { ServerDrivenTrpcChannelProvider } from "@mcp-browser-kit/server-driven-trpc-channel-provider";
import { ServerDrivingMcpServer } from "@mcp-browser-kit/server-driving-mcp-server";
import { container } from "./services/container";

const trpcServer = container.get<ServerDrivenTrpcChannelProvider>(
	ServerDrivenTrpcChannelProvider,
);
await trpcServer.start();

const mcpServer = container.get<ServerDrivingMcpServer>(ServerDrivingMcpServer);
await mcpServer.initMcpServer();
await mcpServer.listenOnStdio();
