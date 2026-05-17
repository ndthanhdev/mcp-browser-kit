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

const typingDelay = () => delay(30 + Math.random() * 70);

const typeTextHumanLike = async (
	element: HTMLInputElement | HTMLTextAreaElement,
	value: string,
) => {
	element.focus();
	const prototype =
		element instanceof HTMLTextAreaElement
			? HTMLTextAreaElement.prototype
			: HTMLInputElement.prototype;
	const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

	for (let i = 0; i < value.length; i++) {
		const char = value[i];
		const newValue = value.slice(0, i + 1);
		const keyInit: KeyboardEventInit = {
			key: char,
			keyCode: char.charCodeAt(0),
			charCode: char.charCodeAt(0),
			which: char.charCodeAt(0),
			bubbles: true,
			cancelable: true,
		};

		element.dispatchEvent(new KeyboardEvent("keydown", keyInit));
		element.dispatchEvent(new KeyboardEvent("keypress", keyInit));

		if (nativeSetter) {
			nativeSetter.call(element, newValue);
		} else {
			element.value = newValue;
		}
		element.dispatchEvent(
			new Event("input", {
				bubbles: true,
			}),
		);
		element.dispatchEvent(new KeyboardEvent("keyup", keyInit));

		await typingDelay();
	}
	element.dispatchEvent(
		new Event("change", {
			bubbles: true,
		}),
	);
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

export const fillTextToElementByReadablePath = async (
	element: HTMLElement,
	value: string,
) => {
	if (element) {
		await playClickAnimationOnElement(element);
		await typeTextHumanLike(
			element as HTMLInputElement | HTMLTextAreaElement,
			value,
		);
	}
};

export const fillTextToFocusedElement = async (value: string) => {
	const element = document.activeElement;
	if (element && element instanceof HTMLElement) {
		await typeTextHumanLike(
			element as HTMLInputElement | HTMLTextAreaElement,
			value,
		);
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
