import type { LoggerFactory } from "@mcp-browser-kit/types";

export interface LoggerFactoryOutputPort extends LoggerFactory {}

export const LoggerFactoryOutputPort = Symbol("LoggerFactoryOutputPort");
