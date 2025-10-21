import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import type { ClickAnimationOptions } from "../utils/animation-tools";
import * as animation from "../utils/animation-tools";
import { TabContextStore } from "./tab-context-store";

@injectable()
export class TabAnimationTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabAnimationTools");
	}

	playClickAnimationAdvance = async (
		x: number,
		y: number,
		options: ClickAnimationOptions = {},
	): Promise<void> => {
		this.logger.info(
			`Playing advanced click animation at (${x}, ${y})`,
			options,
		);
		await animation.playClickAnimationAdvance(x, y, options);
		this.logger.verbose("Advanced click animation completed");
	};

	playClickAnimation = async (x: number, y: number): Promise<void> => {
		this.logger.info(`Playing click animation at (${x}, ${y})`);
		await animation.playClickAnimation(x, y);
		this.logger.verbose("Click animation completed");
	};

	playClickAnimationOnElement = async (element: Element): Promise<void> => {
		this.logger.info("Playing click animation on element");
		if (element instanceof HTMLElement) {
			await animation.playClickAnimationOnElement(element);
			this.logger.verbose("Click animation on element completed");
		} else {
			this.logger.warn("Element is not an HTMLElement, animation skipped");
		}
	};

	playClickAnimationOnElementByReadablePath = async (
		readablePath: string,
	): Promise<void> => {
		this.logger.info(
			`Playing click animation on element at path: ${readablePath}`,
		);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(
				`Element not found at path: ${readablePath}, animation skipped`,
			);
			return;
		}
		await this.playClickAnimationOnElement(element);
	};

	playScanAnimation = async (): Promise<void> => {
		this.logger.info("Playing scan animation");
		await animation.playScanAnimation();
		this.logger.verbose("Scan animation completed");
	};
}
