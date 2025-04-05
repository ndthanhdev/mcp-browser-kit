#!/usr/bin/env node
import { BrowserDriverOutputPort } from "@mcp-browser-kit/core-server";
import { DrivenBrowserDriver } from "@mcp-browser-kit/driven-browser-driver/helpers/driven-browser-driver";
import { container } from "./helpers/container";
import { startMcpServer } from "./helpers/mcp-server";
import { startTRpcServer } from "./helpers/trpc-server";

container
	.bind<BrowserDriverOutputPort>(BrowserDriverOutputPort)
	.to(DrivenBrowserDriver);

startTRpcServer();
startMcpServer();
