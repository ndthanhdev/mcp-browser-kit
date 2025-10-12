import { createServer } from "node:net";
import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { MAX_PORT, MIN_PORT } from "@mcp-browser-kit/core-utils";
import { inject, injectable } from "inversify";

@injectable()
export class PortFinder {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("PortFinder");
		this.logger.verbose(
			`Initialized PortFinder for port range ${MIN_PORT}-${MAX_PORT}`,
		);
	}

	/**
	 * Check if a specific port is available
	 */
	private async isPortAvailable(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const server = createServer();

			server.once("error", () => {
				this.logger.verbose(`Port ${port} is not available`);
				resolve(false);
			});

			server.once("listening", () => {
				server.close();
				this.logger.verbose(`Port ${port} is available`);
				resolve(true);
			});

			// Listen on all interfaces (both IPv4 and IPv6) to match how the actual server starts
			server.listen(port);
		});
	}

	/**
	 * Find an available port in the range defined by MIN_PORT and MAX_PORT
	 * @returns The first available port number, or null if no ports are available
	 */
	async findAvailablePort(): Promise<number | null> {
		this.logger.info(
			`Searching for available port in range ${MIN_PORT}-${MAX_PORT}`,
		);

		for (let port = MIN_PORT; port <= MAX_PORT; port++) {
			const isAvailable = await this.isPortAvailable(port);
			if (isAvailable) {
				this.logger.info(`Found available port: ${port}`);
				return port;
			}
		}

		this.logger.warn(
			`No available ports found in range ${MIN_PORT}-${MAX_PORT}`,
		);
		return null;
	}

	/**
	 * Find all available ports in the range defined by MIN_PORT and MAX_PORT
	 * @returns Array of available port numbers
	 */
	async findAllAvailablePorts(): Promise<number[]> {
		this.logger.info(`Checking all ports in range ${MIN_PORT}-${MAX_PORT}`);

		const availablePorts: number[] = [];
		const checkPromises: Promise<void>[] = [];

		for (let port = MIN_PORT; port <= MAX_PORT; port++) {
			const currentPort = port;
			checkPromises.push(
				this.isPortAvailable(currentPort).then((isAvailable) => {
					if (isAvailable) {
						availablePorts.push(currentPort);
					}
				}),
			);
		}

		await Promise.all(checkPromises);
		const sortedPorts = availablePorts.sort((a, b) => a - b);

		this.logger.info(
			`Found ${sortedPorts.length} available ports: [${sortedPorts.join(", ")}]`,
		);
		return sortedPorts;
	}

	/**
	 * Check if a specific port within the valid range is available
	 * @param port - Port number to check
	 * @returns true if the port is available and within the valid range, false otherwise
	 */
	async checkPort(port: number): Promise<boolean> {
		if (port < MIN_PORT || port > MAX_PORT) {
			this.logger.warn(
				`Port ${port} is outside valid range ${MIN_PORT}-${MAX_PORT}`,
			);
			return false;
		}

		this.logger.verbose(`Checking port ${port}`);
		return this.isPortAvailable(port);
	}
}
