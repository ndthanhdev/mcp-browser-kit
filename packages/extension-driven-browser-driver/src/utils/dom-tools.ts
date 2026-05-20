import delay from "delay";
import { playClickAnimationOnElement } from "./animation-tools";

/**
 * Observes DOM mutations for up to `ms` milliseconds.
 * Resolves true if any mutation fires within the window, false otherwise.
 */
export const watchMutation = (ms: number): Promise<boolean> =>
	new Promise((resolve) => {
		let fired = false;
		const observer = new MutationObserver(() => {
			fired = true;
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		});
		setTimeout(() => {
			observer.disconnect();
			resolve(fired);
		}, ms);
	});

export const clickOnCoordinates = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element && element instanceof HTMLElement) {
		(element as HTMLButtonElement).click();
	}
};

/**
 * Dispatches a full pointer + mouse event chain at the element's center.
 * Useful when element.click() is intercepted by a JS framework and produces no effect.
 */
export const clickOnElementFallback = (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const eventInit: MouseEventInit = {
		bubbles: true,
		cancelable: true,
		clientX: cx,
		clientY: cy,
	};
	for (const type of [
		"pointerdown",
		"mousedown",
		"pointerup",
		"mouseup",
		"click",
	] as const) {
		element.dispatchEvent(new MouseEvent(type, eventInit));
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

/**
 * Returns true when the input/textarea element holds exactly `value`.
 */
export const verifyFillEffect = (
	element: HTMLElement,
	value: string,
): boolean => (element as HTMLInputElement).value === value;

/**
 * Fill strategy: clears the field and uses execCommand('insertText') so that
 * framework-level input handlers (e.g. React synthetic events) fire.
 */
export const fillTextExecCommand = async (
	element: HTMLElement,
	value: string,
): Promise<void> => {
	const el = element as HTMLInputElement | HTMLTextAreaElement;
	el.focus();
	el.select();
	document.execCommand("insertText", false, value);
};

/**
 * Fill strategy: sets the value directly via the native prototype setter then
 * dispatches input + change events. Works even when execCommand is disabled.
 */
export const fillTextNativeSetter = (
	element: HTMLElement,
	value: string,
): void => {
	const el = element as HTMLInputElement | HTMLTextAreaElement;
	el.focus();

	const prototype =
		el instanceof HTMLTextAreaElement
			? HTMLTextAreaElement.prototype
			: HTMLInputElement.prototype;
	const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

	if (nativeSetter) {
		nativeSetter.call(el, value);
	} else {
		el.value = value;
	}
	el.dispatchEvent(
		new Event("input", {
			bubbles: true,
		}),
	);
	el.dispatchEvent(
		new Event("change", {
			bubbles: true,
		}),
	);
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

/**
 * Enter strategy: calls requestSubmit() (or submit() as inner fallback) on
 * the closest ancestor form. Does nothing if no form ancestor exists.
 */
export const hitEnterRequestSubmit = (element: HTMLElement): void => {
	const form = element.closest("form");
	if (!form) return;
	try {
		form.requestSubmit();
	} catch {
		form.submit();
	}
};

/**
 * Enter strategy: clicks the nearest [type="submit"] button relative to the
 * element, then falls back to the first submit button in the document.
 */
export const hitEnterSubmitButton = (element: HTMLElement): void => {
	const submitBtn =
		element.closest<HTMLElement>('[type="submit"]') ??
		element.closest("form")?.querySelector<HTMLElement>('[type="submit"]') ??
		document.querySelector<HTMLElement>('[type="submit"]');
	submitBtn?.click();
};

export const getSerializableSelection = () => {
	const selection = globalThis.getSelection();
	return {
		selectedText: selection?.toString() ?? "",
	};
};
