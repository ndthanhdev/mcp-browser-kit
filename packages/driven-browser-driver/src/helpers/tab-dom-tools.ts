import { inject, injectable } from "inversify";
import * as dom from "../utils/dom-tools";
import { TabContextStore } from "./tab-context-store";

@injectable()
export class TabDomTools {
	constructor(
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {}

	clickOnCoordinates(x: number, y: number) {
		return dom.clickOnCoordinates(x, y);
	}

	async clickOnElementBySelector(readablePath: string) {
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) return;
		return dom.clickOnElementBySelector(element);
	}

	fillTextToElementBySelector(readablePath: string, value: string) {
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) return;
		return dom.fillTextToElementBySelector(element, value);
	}

	fillTextToFocusedElement(value: string) {
		return dom.fillTextToFocusedElement(value);
	}

	focusOnElement(readablePath: string) {
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) return;
		return dom.focusOnElement(element);
	}

	focusOnCoordinates(x: number, y: number) {
		return dom.focusOnCoordinates(x, y);
	}

	getInnerText() {
		return dom.getInnerText();
	}

	async hitEnterOnElementBySelector(readablePath: string) {
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) return;
		return dom.hitEnterOnElementBySelector(element);
	}

	async hitEnterOnFocusedElement() {
		return dom.hitEnterOnFocusedElement();
	}
}
