#!/usr/bin/env node
import { ExtensionDriverOutputPort } from "@mcp-browser-kit/core-server";
import { DrivenExtensionDriver } from "@mcp-browser-kit/driven-extension-driver/helpers/driven-extension-driver";
import { container } from "./helpers/container";
import { startMcpServer } from "./helpers/mcp-server";
import { startTrpcServer } from "./helpers/trpc-server";

container
	.bind<ExtensionDriverOutputPort>(ExtensionDriverOutputPort)
	.to(DrivenExtensionDriver);

startTrpcServer();
startMcpServer();
