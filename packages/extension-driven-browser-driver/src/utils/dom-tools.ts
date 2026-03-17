import delay from "delay";
import { playClickAnimationOnElement } from "./animation-tools";

export const clickOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		(element as HTMLButtonElement).click();
	}
};

export const clickOnElementByReadablePath = async (element: HTMLElement) => {
	if (element) {
		await playClickAnimationOnElement(element);
		element.click();
	}
};

const humanDelay = () => delay(50 + Math.random() * 150);

export const dispatchEnter = async (element: HTMLElement) => {
	const dict = {
		key: "Enter",
		code: "Enter",
		which: 13,
		keyCode: 13,
		bubbles: true,
		cancelable: true,
	};
	const notCancelled = element.dispatchEvent(
		new KeyboardEvent("keydown", dict),
	);
	await humanDelay();
	element.dispatchEvent(new KeyboardEvent("keyup", dict));

	// Programmatically dispatched KeyboardEvents are "untrusted" and browsers
	// do not perform default actions (like form submission) for them.
	// Simulate the browser's default behaviour: if Enter was pressed on an
	// element inside a <form> and the keydown was not preventDefault()'d,
	// submit the form via requestSubmit() so that the 'submit' event fires
	// (which React's onSubmit handler listens for).
	if (notCancelled) {
		const form = element.closest("form");
		if (form) {
			form.requestSubmit();
		}
	}
};

const setNativeValue = (element: HTMLElement, value: string) => {
	const prototype =
		element instanceof HTMLTextAreaElement
			? HTMLTextAreaElement.prototype
			: HTMLInputElement.prototype;
	const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
	if (nativeSetter) {
		nativeSetter.call(element, value);
	} else {
		(element as HTMLInputElement).value = value;
	}
	element.dispatchEvent(
		new Event("input", {
			bubbles: true,
		}),
	);
	element.dispatchEvent(
		new Event("change", {
			bubbles: true,
		}),
	);
};

export const fillTextToElementByReadablePath = async (
	element: HTMLElement,
	value: string,
) => {
	if (element) {
		await playClickAnimationOnElement(element);
		setNativeValue(element, value);
	}
};

export const fillTextToFocusedElement = (value: string) => {
	const element = document.activeElement;
	if (element && element instanceof HTMLElement) {
		setNativeValue(element, value);
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

export const hitEnterOnElementByReadablePath = async (element: HTMLElement) => {
	if (element) {
		focusOnElement(element);
		await playClickAnimationOnElement(element);
		await dispatchEnter(element);
	}
};

export const hitEnterOnFocusedElement = async () => {
	const element = document.activeElement;
	if (element && element instanceof HTMLElement) {
		await dispatchEnter(element);
	}
};

export const getSerializableSelection = () => {
	const selection = globalThis.getSelection();
	return {
		selectedText: selection?.toString() ?? "",
	};
};
