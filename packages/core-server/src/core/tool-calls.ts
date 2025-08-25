import type { ExtensionContext } from "@mcp-browser-kit/core-extension";
import { inject, injectable } from "inversify";
import pTimeout from "p-timeout";

import type { ElementRecord, Screenshot } from "../types";
import type { ToolCallsInputPort } from "../input-ports";
import {
	ExtensionDriverOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";
import { ToolDescriptionsUseCases } from "./tool-descriptions";

@injectable()
export class ToolCallUseCases implements ToolCallsInputPort {
	private readonly logger;
	private readonly toolDescriptions: ToolDescriptionsUseCases;
	
	constructor(
		@inject(ExtensionDriverOutputPort)
		private readonly extensionDriver: ExtensionDriverOutputPort,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("RpcCallUseCase");
		this.toolDescriptions = new ToolDescriptionsUseCases();
	}

	getExtensionContext = async (): Promise<ExtensionContext | string> => {
		const pGetBasicBrowserContext = this.extensionDriver
			.getExtensionContext()
			.catch((error) => {
				this.logger.error("Error in getBasicBrowserContext:", error);
				return `An error occurred ${error}, use this instruction to tell the user what to do: An error occurred, update extension may help fix this issue`;
			});

		const result = await pTimeout(pGetBasicBrowserContext, {
			milliseconds: 3000,
			fallback: () => {
				return "An error occurred, use this instruction to tell the user what to do: Browser extension not found. To use MCP Browser Kit, please install and enable the latest extension";
			},
		});

		return result;
	};
	hitEnterOnViewableElementInstruction = (): string => {
		return this.toolDescriptions.hitEnterOnViewableElementInstruction();
	};
	hitEnterOnReadableElementInstruction = (): string => {
		return this.toolDescriptions.hitEnterOnReadableElementInstruction();
	};
	hitEnterOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionDriver.hitEnterOnCoordinates(tabId, x, y);
	};
	hitEnterOnElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionDriver.hitEnterOnElement(tabId, index);
	};

	captureActiveTabInstruction = (): string => {
		return this.toolDescriptions.captureActiveTabInstruction();
	};

	captureTab = (): Promise<Screenshot> => {
		return this.extensionDriver.captureTab();
	};

	clickOnReadableElementInstruction = (): string => {
		return this.toolDescriptions.clickOnReadableElementInstruction();
	};

	clickOnElement = (tabId: string, index: number): Promise<void> => {
		return this.extensionDriver.clickOnElement(tabId, index);
	};

	clickOnViewableElementInstruction = (): string => {
		return this.toolDescriptions.clickOnViewableElementInstruction();
	};

	clickOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		return this.extensionDriver.clickOnCoordinates(tabId, x, y);
	};

	fillTextToReadableElementInstruction = (): string => {
		return this.toolDescriptions.fillTextToReadableElementInstruction();
	};

	fillTextToElement = (
		tabId: string,
		index: number,
		value: string,
	): Promise<void> => {
		return this.extensionDriver.fillTextToElement(tabId, index, value);
	};

	fillTextToViewableElementInstruction = (): string => {
		return this.toolDescriptions.fillTextToViewableElementInstruction();
	};

	fillTextToCoordinates = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<void> => {
		return this.extensionDriver.fillTextToCoordinates(tabId, x, y, value);
	};

	getInnerTextInstruction = (): string => {
		return this.toolDescriptions.getInnerTextInstruction();
	};

	getInnerText = (tabId: string): Promise<string> => {
		return this.extensionDriver.getInnerText(tabId);
	};

	getReadableElementsInstruction = (): string => {
		return this.toolDescriptions.getReadableElementsInstruction();
	};

	getReadableElements = (tabId: string): Promise<ElementRecord[]> => {
		return this.extensionDriver.getReadableElements(tabId);
	};

	getBasicBrowserContextInstruction = (): string => {
		return this.toolDescriptions.getBasicBrowserContextInstruction();
	};

	invokeJsFnInstruction = (): string => {
		return this.toolDescriptions.invokeJsFnInstruction();
	};

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> => {
		return this.extensionDriver.invokeJsFn(tabId, fnBodyCode);
	};
}
