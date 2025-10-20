import type { Selection } from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import * as dom from "../utils/dom-tools";
import { TabContextStore } from "./tab-context-store";

@injectable()
export class TabDomTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabDomTools");
	}

	clickOnCoordinates = (x: number, y: number) => {
		this.logger.info(`Clicking on coordinates (${x}, ${y})`);
		const result = dom.clickOnCoordinates(x, y);
		this.logger.verbose("Click on coordinates completed");
		return result;
	};

	clickOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Clicking on element at path: ${readablePath}`);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}
		const result = await dom.clickOnElementByReadablePath(element);
		this.logger.verbose("Click on element completed");
		return result;
	};

	fillTextToElementByReadablePath = (readablePath: string, value: string) => {
		this.logger.info(
			`Filling text to element at path: ${readablePath}, value length: ${value.length}`,
		);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}
		const result = dom.fillTextToElementByReadablePath(element, value);
		this.logger.verbose("Fill text completed");
		return result;
	};

	fillTextToFocusedElement = (value: string) => {
		this.logger.info(
			`Filling text to focused element, value length: ${value.length}`,
		);
		const result = dom.fillTextToFocusedElement(value);
		this.logger.verbose("Fill text to focused element completed");
		return result;
	};

	focusOnElement = (readablePath: string) => {
		this.logger.info(`Focusing on element at path: ${readablePath}`);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}
		const result = dom.focusOnElement(element);
		this.logger.verbose("Focus on element completed");
		return result;
	};

	focusOnCoordinates = (x: number, y: number) => {
		this.logger.info(`Focusing on coordinates (${x}, ${y})`);
		const result = dom.focusOnCoordinates(x, y);
		this.logger.verbose("Focus on coordinates completed");
		return result;
	};

	getInnerText = () => {
		this.logger.verbose("Getting inner text");
		const result = dom.getInnerText();
		this.logger.verbose(`Retrieved inner text (${result.length} characters)`);
		return result;
	};

	hitEnterOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Hitting enter on element at path: ${readablePath}`);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}
		const result = await dom.hitEnterOnElementByReadablePath(element);
		this.logger.verbose("Hit enter on element completed");
		return result;
	};

	hitEnterOnFocusedElement = async () => {
		this.logger.info("Hitting enter on focused element");
		const result = await dom.hitEnterOnFocusedElement();
		this.logger.verbose("Hit enter on focused element completed");
		return result;
	};

	getSelection = (): Selection => {
		this.logger.verbose("Getting text selection");
		const result = dom.getSerializableSelection();
		this.logger.verbose(
			`Retrieved selection: ${result.selectedText ? `"${result.selectedText.substring(0, 50)}..."` : "none"}`,
		);
		return result;
	};
}
