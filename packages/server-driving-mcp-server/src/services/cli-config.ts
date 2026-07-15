import { DEFAULT_HTTP_PORT } from "@mcp-browser-kit/core-utils";
import { parseArgs } from "citty";
import { injectable } from "inversify";

export type TransportMode = "stdio" | "http";

const ARGS_DEF = {
	transport: {
		type: "enum",
		options: [
			"stdio",
			"http",
		] as string[],
		default: "stdio",
		description: "MCP transport to use",
	},
	"http-host": {
		type: "string",
		default: "127.0.0.1",
		description: "Host to bind the HTTP transport to",
	},
	"http-port": {
		type: "string",
		default: String(DEFAULT_HTTP_PORT),
		description: "Port to bind the HTTP transport to",
	},
} as const;

@injectable()
export class CliConfig {
	private readonly values: ReturnType<typeof parseArgs<typeof ARGS_DEF>>;

	constructor() {
		this.values = parseArgs<typeof ARGS_DEF>(process.argv.slice(2), ARGS_DEF);
	}

	getTransportMode(): TransportMode {
		// citty validates this against ARGS_DEF.transport.options at parse time.
		return this.values.transport as TransportMode;
	}

	getHttpHost(): string {
		return this.values["http-host"];
	}

	getHttpPort(): number {
		const port = Number(this.values["http-port"]);
		if (!Number.isInteger(port) || port <= 0 || port > 65535) {
			throw new Error(
				`Invalid --http-port value: "${this.values["http-port"]}".`,
			);
		}
		return port;
	}
}
