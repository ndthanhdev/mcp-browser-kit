import type { InternalTabContext } from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { findNodeByPath } from "@mcp-browser-kit/core-utils/tree";
import { inject, injectable } from "inversify";

@injectable()
export class TabContextStore {
	private latestCapturedTabContext: InternalTabContext | undefined;
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
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

	getElementFromPath = (readablePath: string): HTMLElement | null => {
		this.logger.verbose(`Getting element from path: ${readablePath}`);

		// Get readableTree from contextStore
		const tabContext = this.getLatestCapturedTabContext();
		if (!tabContext?.readableTree) {
			this.logger.error("No readable tree available in context store");
			throw new Error("No readable tree available in context store");
		}

		// Find element by path
		const node = findNodeByPath(tabContext.readableTree, readablePath);
		if (!node) {
			this.logger.error(`Element not found at path: ${readablePath}`);
			throw new Error(`Element not found at path: ${readablePath}`);
		}

		const element = node.data as HTMLElement;

		// Check if element still exists in document
		if (!document.contains(element)) {
			this.logger.error(
				`Element at path ${readablePath} no longer exists in document`,
			);
			throw new Error(
				`Element at path ${readablePath} no longer exists in document`,
			);
		}

		this.logger.verbose(`Element found and validated: ${element.tagName}`);
		return element;
	};
}
