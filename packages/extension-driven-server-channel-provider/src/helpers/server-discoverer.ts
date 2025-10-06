import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import { createPrefixId } from "@mcp-browser-kit/utils";
import Emittery from "emittery";
import { inject, injectable } from "inversify";

export interface PortDiscoveryEvents {
	online: {
		url: string;
		port: number;
	};
	offline: {
		url: string;
		port: number;
	};
}

@injectable()
export class ServerDiscoverer {
	private static readonly MIN_PORT = 2769;
	private static readonly MAX_PORT = 2799;
	private static readonly CONNECTION_TIMEOUT_MS = 3000;
	private static readonly CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
	private static readonly serverDiscovererId = createPrefixId("sd");

	private readonly instanceId: string;
	private readonly eventEmitter: Emittery<PortDiscoveryEvents>;
	private readonly logger;
	private discovering = false;
	private discoveryIntervalId: NodeJS.Timeout | null = null;
	private knownOnlinePorts = new Set<number>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.instanceId = ServerDiscoverer.serverDiscovererId.generate();
		this.logger = this.loggerFactory.create("ServerDiscoverer");
		this.eventEmitter = new Emittery<PortDiscoveryEvents>();

		this.logger.verbose(
			`[${this.instanceId}] Initialized ServerDiscoverer for ports ${ServerDiscoverer.MIN_PORT}-${ServerDiscoverer.MAX_PORT}`,
		);
	}

	/**
	 * Subscribe to port discovery events
	 */
	on: Emittery<PortDiscoveryEvents>["on"] = (event, callback) => {
		return this.eventEmitter.on(event, callback);
	};

	/**
	 * Start discovering active ports in the configured range (runs periodically)
	 */
	startDiscovery = async (): Promise<void> => {
		if (this.discovering) {
			this.logger.warn(
				`[${this.instanceId}] Discovery already in progress, skipping`,
			);
			return;
		}

		this.discovering = true;
		this.logger.verbose(
			`[${this.instanceId}] Starting periodic port discovery (interval: ${ServerDiscoverer.CHECK_INTERVAL_MS}ms)`,
		);

		// Run initial discovery
		await this.performDiscoveryCycle();

		// Set up periodic discovery
		this.discoveryIntervalId = setInterval(() => {
			this.performDiscoveryCycle();
		}, ServerDiscoverer.CHECK_INTERVAL_MS);
	};

	/**
	 * Stop the periodic port discovery
	 */
	stopDiscovery = (): void => {
		if (!this.discovering) {
			this.logger.warn(`[${this.instanceId}] Discovery is not running`);
			return;
		}

		if (this.discoveryIntervalId) {
			clearInterval(this.discoveryIntervalId);
			this.discoveryIntervalId = null;
		}

		this.discovering = false;
		this.knownOnlinePorts.clear();
		this.logger.verbose(`[${this.instanceId}] Stopped port discovery`);
	};

	/**
	 * Perform a single discovery cycle across all ports
	 */
	private performDiscoveryCycle = async (): Promise<void> => {
		this.logger.verbose(`[${this.instanceId}] Running discovery cycle`);

		const discoveryPromises: Promise<void>[] = [];
		const currentlyOnlinePorts = new Set<number>();

		for (
			let port = ServerDiscoverer.MIN_PORT;
			port <= ServerDiscoverer.MAX_PORT;
			port++
		) {
			discoveryPromises.push(
				this.checkPort(port).then((isOnline) => {
					if (isOnline) {
						currentlyOnlinePorts.add(port);
					}
				}),
			);
		}

		await Promise.allSettled(discoveryPromises);

		// Detect ports that went offline
		for (const port of this.knownOnlinePorts) {
			if (!currentlyOnlinePorts.has(port)) {
				const url = `http://localhost:${port}`;
				this.logger.verbose(`[${this.instanceId}] Port ${port} went offline`);
				this.eventEmitter.emit("offline", {
					url,
					port,
				});
			}
		}

		// Update known online ports
		this.knownOnlinePorts = currentlyOnlinePorts;

		this.logger.verbose(
			`[${this.instanceId}] Discovery cycle completed (${currentlyOnlinePorts.size} ports online)`,
		);
	};

	/**
	 * Check if a specific port is active using fetch
	 * @returns true if the port is online, false otherwise
	 */
	private checkPort = async (port: number): Promise<boolean> => {
		const url = `http://localhost:${port}`;

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, ServerDiscoverer.CONNECTION_TIMEOUT_MS);

		try {
			await fetch(url, {
				method: "GET",
				signal: controller.signal,
			});

			clearTimeout(timeout);

			// Only emit online event if this is a new port or wasn't previously known
			const wasKnownOnline = this.knownOnlinePorts.has(port);
			if (!wasKnownOnline) {
				this.logger.verbose(`[${this.instanceId}] Port ${port} is now online`);
				this.eventEmitter.emit("online", {
					url,
					port,
				});
			}

			return true;
		} catch {
			clearTimeout(timeout);
			return false;
		}
	};

	/**
	 * Get the instance ID for this discovery service
	 */
	getInstanceId(): string {
		return this.instanceId;
	}

	/**
	 * Check if discovery is currently in progress
	 */
	isDiscovering(): boolean {
		return this.discovering;
	}
}
