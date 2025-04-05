#!/usr/bin/env node
import {
	BrowserDriverOutputPort,
	createCoreServerContainer,
} from "@mcp-browser-kit/core-server";
import { DrivenBrowserDriver } from "@mcp-browser-kit/driven-browser-driver/helpers/driven-browser-driver";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { container } from "./helpers/container";
import { startMcpServer } from "./helpers/mcp-server";
import { startTRpcServer } from "./helpers/trpc-server";

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriver);

startTRpcServer();
startMcpServer();
