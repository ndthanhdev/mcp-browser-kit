import delay from "delay";
import { playClickAnimationOnElement } from "./animation-tools";

export const clickOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		(element as HTMLButtonElement).click();
	}
};

export const clickOnElementBySelector = async (selector: string) => {
	const element = document.querySelector(selector) as HTMLElement;
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
	selector: string,
	value: string,
) => {
	const element = document.querySelector(selector) as HTMLElement;
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

export const focusOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		element.focus();
	}
};

export const generateElementRecords = (elements: HTMLElement[]) => {
	const table = elements.map((el, index) => {
		const tag = el.tagName.toLowerCase();
		const label =
			el.getAttribute("aria-label") ??
			el.getAttribute("placeholder") ??
			el.innerText ??
			"";
		return {
			elementId: index,
			role: tag,
			accessibleText: label,
		};
	});
	return table;
};

export const getInnerText = () => {
	return document.body.innerText;
};

export const getReadableElements = () => {
	return generateElementRecords(getReadableHtmlElements());
};

export const getReadableHtmlElements = () => {
	const labeledElements =
		document.querySelectorAll<HTMLElement>("[aria-label]");
	const placeholderElements = document.querySelectorAll<HTMLElement>(
		":not([aria-label])[placeholder]",
	);
	const buttonsWithText = Array.from(
		document.querySelectorAll<HTMLElement>("button:not([aria-label])"),
	).filter((el) => {
		const text = el.innerText;
		return text && text.trim() !== "";
	});
	const linksWithText = Array.from(
		document.querySelectorAll<HTMLElement>("a:not([aria-label])"),
	).filter((el) => {
		const text = el.innerText;
		return text && text.trim() !== "";
	});

	const readableElements = Array.from(
		new Set([
			...Array.from(labeledElements),
			...Array.from(placeholderElements),
			...buttonsWithText,
			...linksWithText,
		]),
	);

	return readableElements;
};

export const hitEnterOnElementBySelector = async (selector: string) => {
	const element = document.querySelector(selector) as HTMLElement;
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
