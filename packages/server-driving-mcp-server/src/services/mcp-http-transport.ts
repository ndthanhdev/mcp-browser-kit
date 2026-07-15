import { randomUUID } from "node:crypto";
import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import {
	LoggerFactoryOutputPort,
	type LoggerFactoryOutputPort as LoggerFactoryOutputPortInterface,
} from "@mcp-browser-kit/core-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { inject, injectable } from "inversify";
import { McpServerFactory } from "./mcp-server-factory";

const MCP_HTTP_PATH = "/mcp";
const SESSION_ID_HEADER = "mcp-session-id";

interface HttpSession {
	server: McpServer;
	transport: StreamableHTTPServerTransport;
	unsubscribeResources: () => void;
}

/**
 * Streamable HTTP transport for the MCP server. Supports multiple concurrent
 * sessions: each new (non-initialize-carrying) connection gets its own
 * `McpServer` + `StreamableHTTPServerTransport` pair, tracked by the
 * `Mcp-Session-Id` the transport generates on `initialize`.
 */
@injectable()
export class McpHttpTransport {
	private readonly logger;
	private httpServer: Server | null = null;
	private readonly sessions = new Map<string, HttpSession>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPortInterface,
		@inject(McpServerFactory)
		private readonly mcpServerFactory: McpServerFactory,
	) {
		this.logger = loggerFactory.create("mcpHttpTransport");
	}

	async start(host: string, port: number): Promise<void> {
		this.httpServer = createServer((req, res) => {
			this.handleHttpRequest(req, res, host, port).catch((error) => {
				this.logger.error("Unhandled error while handling MCP HTTP request", {
					error: error instanceof Error ? error.message : String(error),
				});
				if (!res.headersSent) {
					res.writeHead(500).end();
				}
			});
		});

		await new Promise<void>((resolve) => {
			this.httpServer?.listen(port, host, () => {
				this.logger.info(
					`MCP Browser Kit Server running on http://${host}:${port}${MCP_HTTP_PATH}`,
				);
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
		if (!this.httpServer) return;

		for (const sessionId of [
			...this.sessions.keys(),
		]) {
			this.closeSession(sessionId);
		}
		await new Promise<void>((resolve) => {
			this.httpServer?.close(() => resolve());
		});
		this.httpServer = null;
	}

	private async handleHttpRequest(
		req: IncomingMessage,
		res: ServerResponse,
		host: string,
		port: number,
	): Promise<void> {
		if (req.url !== MCP_HTTP_PATH) {
			res.writeHead(404).end();
			return;
		}

		const sessionIdHeader = req.headers[SESSION_ID_HEADER];
		const sessionId =
			typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;
		const existing = sessionId ? this.sessions.get(sessionId) : undefined;

		if (req.method === "GET" || req.method === "DELETE") {
			if (!existing) {
				res.writeHead(400).end(this.invalidSessionResponseBody());
				return;
			}
			await existing.transport.handleRequest(req, res);
			return;
		}

		if (req.method !== "POST") {
			res.writeHead(405).end();
			return;
		}

		const body = await this.readJsonBody(req);

		if (existing) {
			await existing.transport.handleRequest(req, res, body);
			return;
		}

		if (!this.isInitializeRequest(body)) {
			res.writeHead(400).end(this.invalidSessionResponseBody());
			return;
		}

		await this.handleNewSession(req, res, body, host, port);
	}

	private async handleNewSession(
		req: IncomingMessage,
		res: ServerResponse,
		body: unknown,
		host: string,
		port: number,
	): Promise<void> {
		const { server, unsubscribeResources } = this.mcpServerFactory.create();

		// DNS-rebinding protection can only enforce a Host allowlist for the
		// safe loopback default. If the operator explicitly opted into a
		// non-loopback bind (e.g. 0.0.0.0), skip the allowlist rather than
		// silently rejecting every real request.
		const isLoopback = host === "127.0.0.1" || host === "localhost";

		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			enableDnsRebindingProtection: isLoopback,
			allowedHosts: isLoopback
				? [
						`127.0.0.1:${port}`,
						`localhost:${port}`,
					]
				: undefined,
			onsessioninitialized: (initializedSessionId) => {
				this.logger.info("MCP HTTP session initialized", {
					sessionId: initializedSessionId,
				});
				this.sessions.set(initializedSessionId, {
					server,
					transport,
					unsubscribeResources,
				});
			},
		});

		transport.onclose = () => {
			if (transport.sessionId) {
				this.closeSession(transport.sessionId);
			}
		};

		await server.connect(transport);
		await transport.handleRequest(req, res, body);
	}

	private closeSession(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;
		this.sessions.delete(sessionId);

		try {
			session.unsubscribeResources();
		} catch (err) {
			this.logger.error("Error unsubscribing browser resources", err);
		}
		session.server.close().catch((err) => {
			this.logger.error("Error closing MCP server for HTTP session", err);
		});
		this.logger.info("MCP HTTP session closed", {
			sessionId,
		});
	}

	private isInitializeRequest(body: unknown): boolean {
		if (Array.isArray(body)) {
			return body.some((entry) => this.isInitializeRequest(entry));
		}
		return (
			typeof body === "object" &&
			body !== null &&
			(
				body as {
					method?: unknown;
				}
			).method === "initialize"
		);
	}

	private invalidSessionResponseBody(): string {
		return JSON.stringify({
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "No valid session ID provided",
			},
			id: null,
		});
	}

	private async readJsonBody(req: IncomingMessage): Promise<unknown> {
		const chunks: Buffer[] = [];
		for await (const chunk of req) {
			chunks.push(chunk as Buffer);
		}
		const raw = Buffer.concat(chunks).toString("utf-8");
		return raw ? JSON.parse(raw) : undefined;
	}
}
