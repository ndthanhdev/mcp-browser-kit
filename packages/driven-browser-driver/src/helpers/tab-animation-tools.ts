import { inject, injectable } from "inversify";
import type { ClickAnimationOptions } from "../utils/animation-tools";
import * as animation from "../utils/animation-tools";
import { TabContextStore } from "./tab-context-store";

@injectable()
export class TabAnimationTools {
	constructor(
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {}

	playClickAnimationAdvance(
		x: number,
		y: number,
		options: ClickAnimationOptions = {},
	): void {
		animation.playClickAnimationAdvance(x, y, options);
	}

	playClickAnimation(x: number, y: number): void {
		animation.playClickAnimation(x, y);
	}

	playClickAnimationOnElementBySelector(readablePath: string): void {
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) return;
		animation.playClickAnimationOnElement(element);
	}
}
