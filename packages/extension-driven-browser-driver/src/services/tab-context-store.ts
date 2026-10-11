import type { InternalTabContext } from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import { ElementIdRegistry } from "./element-id-registry";

@injectable()
export class TabContextStore {
	private latestCapturedTabContext: InternalTabContext | undefined;
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(ElementIdRegistry)
		private readonly elementIds: ElementIdRegistry,
	) {
		this.logger = this.loggerFactory.create("TabContextStore");
	}

	setLatestCapturedTabContext = (context: InternalTabContext) => {
		this.logger.info("Setting latest captured tab context");
		this.logger.verbose(
			`Context contains ${context.readableElementRecords.length} elements, text length: ${context.textContent.length}`,
		);
		this.latestCapturedTabContext = context;
		this.logger.verbose("Tab context stored successfully");
	};

	getLatestCapturedTabContext = (): InternalTabContext | undefined => {
		this.logger.verbose("Retrieving latest captured tab context");
		const hasContext = this.latestCapturedTabContext !== undefined;
		this.logger.verbose(`Context ${hasContext ? "found" : "not found"}`);
		return this.latestCapturedTabContext;
	};

	clearLatestCapturedTabContext = () => {
		this.logger.info("Clearing latest captured tab context");
		this.latestCapturedTabContext = undefined;
		this.logger.verbose("Tab context cleared");
	};

	idOf = (element: globalThis.Element): string => this.elementIds.idOf(element);

	pruneElementIds = (): void => {
		this.elementIds.prune();
	};

	getElementFromPath = (readablePath: string): HTMLElement => {
		this.logger.verbose(`Getting element from id: ${readablePath}`);
		try {
			const element = this.elementIds.elementOf(readablePath);
			this.logger.verbose(`Element found and validated: ${element.tagName}`);
			return element;
		} catch (error) {
			this.logger.error(error instanceof Error ? error.message : String(error));
			throw error;
		}
	};
}
