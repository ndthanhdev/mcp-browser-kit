import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension";
import type { ExtensionDriverOutputPort } from "@mcp-browser-kit/core-server";
import { DrivenExtensionDriver } from "@mcp-browser-kit/driven-extension-driver";
import Emittery from "emittery";
import { inject, injectable } from "inversify";

export interface ExtensionDriverInstance {
	instanceId: string;
	driver: ExtensionDriverOutputPort;
}

export type ExtensionDriverProviderEventEmitter = Emittery<{
	driverCreated: ExtensionDriverInstance;
	driverDestroyed: ExtensionDriverInstance;
}>;

export interface ExtensionDriverProviderOutputPort {
	on: ExtensionDriverProviderEventEmitter["on"];
	createExtensionDriver: () => Promise<ExtensionDriverInstance>;
	getExtensionDriver: (
		instanceId: string,
	) => ExtensionDriverOutputPort | undefined;
	destroyExtensionDriver: (instanceId: string) => Promise<void>;
	listExtensionDrivers: () => ExtensionDriverInstance[];
}

export const ExtensionDriverProviderOutputPort = Symbol(
	"ExtensionDriverProviderOutputPort",
);

@injectable()
export class DrivenExtensionDriverProvider
	implements ExtensionDriverProviderOutputPort
{
	private readonly eventEmitter: ExtensionDriverProviderEventEmitter;
	private readonly drivers = new Map<string, ExtensionDriverInstance>();
	private readonly logger;
	private instanceCounter = 0;

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("DrivenExtensionDriverProvider");

		this.eventEmitter = new Emittery<{
			driverCreated: ExtensionDriverInstance;
			driverDestroyed: ExtensionDriverInstance;
		}>();
	}

	on: ExtensionDriverProviderEventEmitter["on"] = (event, listener) => {
		return this.eventEmitter.on(event, listener);
	};

	createExtensionDriver = async (): Promise<ExtensionDriverInstance> => {
		const instanceId = `extension-driver-${++this.instanceCounter}`;
		const driver = new DrivenExtensionDriver();

		const instance: ExtensionDriverInstance = {
			instanceId,
			driver,
		};

		this.drivers.set(instanceId, instance);
		this.logger.info(`Created extension driver instance: ${instanceId}`);

		await this.eventEmitter.emit("driverCreated", instance);

		return instance;
	};

	getExtensionDriver = (
		instanceId: string,
	): ExtensionDriverOutputPort | undefined => {
		const instance = this.drivers.get(instanceId);
		return instance?.driver;
	};

	destroyExtensionDriver = async (instanceId: string): Promise<void> => {
		const instance = this.drivers.get(instanceId);
		if (!instance) {
			this.logger.warn(`Extension driver instance not found: ${instanceId}`);
			return;
		}

		this.drivers.delete(instanceId);
		this.logger.info(`Destroyed extension driver instance: ${instanceId}`);

		await this.eventEmitter.emit("driverDestroyed", instance);
	};

	listExtensionDrivers = (): ExtensionDriverInstance[] => {
		return Array.from(this.drivers.values());
	};
}
