#!/usr/bin/env node
import { startMcpServer } from "./helpers/mcp-server";
import { startTrpcServer } from "./helpers/trpc-server";

await startTrpcServer();
startMcpServer();
