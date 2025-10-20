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

	playClickAnimationAdvance = (
		x: number,
		y: number,
		options: ClickAnimationOptions = {},
	): void => {
		this.logger.info(
			`Playing advanced click animation at (${x}, ${y})`,
			options,
		);
		animation.playClickAnimationAdvance(x, y, options);
		this.logger.verbose("Advanced click animation completed");
	};

	playClickAnimation = (x: number, y: number): void => {
		this.logger.info(`Playing click animation at (${x}, ${y})`);
		animation.playClickAnimation(x, y);
		this.logger.verbose("Click animation completed");
	};

	playClickAnimationOnElementByReadablePath = (readablePath: string): void => {
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
		animation.playClickAnimationOnElement(element);
		this.logger.verbose("Click animation on element completed");
	};
}
