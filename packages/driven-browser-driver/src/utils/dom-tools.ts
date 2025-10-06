import delay from "delay";
import { playClickAnimationOnElement } from "./animation-tools";

export const clickOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		(element as HTMLButtonElement).click();
	}
};

export const clickOnElementBySelector = async (element: HTMLElement) => {
	if (element) {
		playClickAnimationOnElement(element);
		element.click();
	}
};

export const dispatchEnter = async (element: HTMLElement) => {
	const dict = {
		key: "Enter",
		code: "Enter",
		which: 13,
		keyCode: 13,
		bubbles: true,
		cancelable: true,
	};
	const humanDelay = 50 + Math.random() * 150;
	element.dispatchEvent(new KeyboardEvent("keydown", dict));
	await delay(humanDelay);
	element.dispatchEvent(new KeyboardEvent("keyup", dict));
};

export const fillTextToElementBySelector = (
	element: HTMLElement,
	value: string,
) => {
	if (element) {
		playClickAnimationOnElement(element);
		(element as HTMLInputElement).value = value;
	}
};

export const fillTextToFocusedElement = (value: string) => {
	const element = document.activeElement;
	if (element && element instanceof HTMLElement) {
		(element as HTMLInputElement).value = value;
	}
};

export const focusOnElement = (element: HTMLElement) => {
	if (element) {
		element.focus();
	}
};

export const focusOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		element.focus();
	}
};

export const getInnerText = () => {
	return document.body.innerText;
};

export const hitEnterOnElementBySelector = async (element: HTMLElement) => {
	if (element) {
		playClickAnimationOnElement(element);
		await dispatchEnter(element);
	}
};

export const hitEnterOnFocusedElement = async () => {
	const element = document.activeElement;
	if (element && element instanceof HTMLElement) {
		await dispatchEnter(element);
	}
};
