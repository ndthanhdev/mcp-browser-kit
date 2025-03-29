#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { startTRpcServer } from "./helpers/trpc-server";
import { startMcpServer } from "./helpers/mcp-server";

startTRpcServer();
startMcpServer();
