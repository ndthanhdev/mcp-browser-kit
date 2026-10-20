import type { ScrollDirection } from "@mcp-browser-kit/core-extension/types";
import delay from "delay";
import { playClickAnimationOnElement } from "./animation-tools";
import {
	editingHostOf,
	getEditingHostText,
	normalizeEditorText,
} from "./editing-host";

/**
 * Starts observing mutations, then runs `act()`.
 * Immediately checks `checkState()`. If true, returns true.
 * Otherwise, waits for mutations up to `options.timeoutMs`.
 * On every mutation (or if acceptAnyMutation is true), evaluates `checkState()`.
 * Returns true if success condition is met, false on timeout.
 */
export const performAndVerify = async (
	act: () => Promise<void> | void,
	checkState: () => boolean,
	options: {
		timeoutMs: number;
		acceptAnyMutation?: boolean;
	},
): Promise<boolean> => {
	let mutated = false;
	let resolveObserver: (val: boolean) => void;

	const observerPromise = new Promise<boolean>((resolve) => {
		resolveObserver = resolve;
	});

	const observer = new MutationObserver(() => {
		mutated = true;
		if (options.acceptAnyMutation) {
			resolveObserver(true);
		} else if (checkState()) {
			resolveObserver(true);
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		characterData: true,
	});

	try {
		await act();

		if (checkState()) {
			return true;
		}
		if (options.acceptAnyMutation && mutated) {
			return true;
		}

		const timeoutPromise = new Promise<boolean>((resolve) => {
			setTimeout(() => {
				resolve(checkState() || (!!options.acceptAnyMutation && mutated));
			}, options.timeoutMs);
		});

		return await Promise.race([
			observerPromise,
			timeoutPromise,
		]);
	} finally {
		observer.disconnect();
	}
};

/**
 * Scrolls the viewport one step in `direction`. The step is `amount` pixels
 * when provided, otherwise ~90% of the viewport along the relevant axis (one
 * "page"). Uses an instant scroll so the resulting position can be read back
 * synchronously. Being already clamped at the requested edge is a no-op success;
 * a failure to move when there is still room throws.
 */
export const scrollPage = (direction: ScrollDirection, amount?: number) => {
	const el = document.scrollingElement ?? document.documentElement;
	const horizontal = direction === "left" || direction === "right";
	const step =
		amount ?? Math.round((horizontal ? innerWidth : innerHeight) * 0.9);
	const sign = direction === "up" || direction === "left" ? -1 : 1;

	const before = horizontal ? el.scrollLeft : el.scrollTop;
	window.scrollBy({
		left: horizontal ? sign * step : 0,
		top: horizontal ? 0 : sign * step,
		behavior: "instant",
	});
	const after = horizontal ? el.scrollLeft : el.scrollTop;

	if (after === before) {
		const atEdge =
			sign < 0
				? before <= 0
				: before + (horizontal ? el.clientWidth : el.clientHeight) >=
					(horizontal ? el.scrollWidth : el.scrollHeight) - 1;
		if (!atEdge) {
			throw new Error(`scrollPage(${direction}): no movement`);
		}
	}
};

/**
 * True when `el` can actually scroll along the given axis: its computed
 * overflow allows scrolling and its scroll size exceeds its client size.
 */
const isScrollable = (el: HTMLElement, horizontal: boolean): boolean => {
	const style = getComputedStyle(el);
	const overflow = horizontal ? style.overflowX : style.overflowY;
	const canOverflow = overflow === "auto" || overflow === "scroll";
	const sizeExceeds = horizontal
		? el.scrollWidth > el.clientWidth
		: el.scrollHeight > el.clientHeight;
	return canOverflow && sizeExceeds;
};

/**
 * Scrolls a scrollable element one step in `direction`. Resolves the actual
 * scroll target by walking up from `element` to the nearest scrollable ancestor
 * (falling back to `element` itself), so callers can target an interactive child
 * inside a panel rather than the container. The step is `amount` pixels when
 * provided, otherwise ~90% of the target's client size along the relevant axis.
 * Uses an instant scroll so the position can be read back synchronously. Being
 * already clamped at the requested edge (or a non-scrollable target) is a no-op
 * success; a failure to move when there is still room throws.
 */
export const scrollElement = (
	element: HTMLElement,
	direction: ScrollDirection,
	amount?: number,
) => {
	const horizontal = direction === "left" || direction === "right";

	let candidate: HTMLElement | null = element;
	while (
		candidate &&
		candidate !== document.body &&
		!isScrollable(candidate, horizontal)
	) {
		candidate = candidate.parentElement;
	}
	const target = candidate ?? element;

	const step =
		amount ??
		Math.round((horizontal ? target.clientWidth : target.clientHeight) * 0.9);
	const sign = direction === "up" || direction === "left" ? -1 : 1;

	const before = horizontal ? target.scrollLeft : target.scrollTop;
	target.scrollBy({
		left: horizontal ? sign * step : 0,
		top: horizontal ? 0 : sign * step,
		behavior: "instant",
	});
	const after = horizontal ? target.scrollLeft : target.scrollTop;

	if (after === before) {
		const atEdge =
			sign < 0
				? before <= 0
				: before + (horizontal ? target.clientWidth : target.clientHeight) >=
					(horizontal ? target.scrollWidth : target.scrollHeight) - 1;
		if (!atEdge) {
			throw new Error(`scrollElement(${direction}): no movement`);
		}
	}
};

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

export const typeTextHumanLike = async (
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

/**
 * What a fill writes into:
 * - `text`: a text-like <input> or <textarea>, filled by typing.
 * - `value`: a date/time/color/range-like <input> whose value must be set in
 *   one step, because typing passes through invalid partial values that the
 *   browser sanitizes to "".
 * - `rich`: the editing host of a contenteditable region (Quill, ProseMirror,
 *   Lexical, ...), which has no `.value`.
 */
export type FillTarget =
	| {
			kind: "text";
			element: HTMLInputElement | HTMLTextAreaElement;
	  }
	| {
			kind: "value";
			element: HTMLInputElement;
	  }
	| {
			kind: "rich";
			element: HTMLElement;
	  };

const TYPEABLE_INPUT_TYPES = new Set([
	"text",
	"email",
	"number",
	"password",
	"search",
	"tel",
	"url",
]);

const VALUE_INPUT_TYPES = new Set([
	"color",
	"date",
	"datetime-local",
	"month",
	"range",
	"time",
	"week",
]);

const describeTag = (element: Element): string =>
	`<${element.tagName.toLowerCase()}>`;

/**
 * Maps the element an agent pointed at to the element that actually takes
 * text: itself for inputs and textareas, the editing host for anything inside
 * a contenteditable region, and the associated control for a <label> or
 * anything inside one. Throws a descriptive error for elements that cannot be
 * filled, so the caller does not attempt strategies that cannot work.
 */
export const resolveFillTarget = (element: Element): FillTarget => {
	if (element instanceof HTMLTextAreaElement) {
		return {
			kind: "text",
			element,
		};
	}
	if (element instanceof HTMLInputElement) {
		const type = element.type.toLowerCase();
		if (TYPEABLE_INPUT_TYPES.has(type)) {
			return {
				kind: "text",
				element,
			};
		}
		if (VALUE_INPUT_TYPES.has(type)) {
			return {
				kind: "value",
				element,
			};
		}
		const hint =
			type === "checkbox" || type === "radio"
				? "; use clickOnElement to toggle it"
				: "";
		throw new Error(`Input of type "${type}" cannot be filled${hint}`);
	}
	if (element instanceof HTMLSelectElement) {
		throw new Error(
			"Element is a <select>, which cannot be filled with text; choose an option instead",
		);
	}
	if (element instanceof HTMLElement && element.isContentEditable) {
		return {
			kind: "rich",
			element: editingHostOf(element),
		};
	}
	const control = element.closest("label")?.control;
	if (control && control !== element) {
		return resolveFillTarget(control);
	}
	throw new Error(
		`Element ${describeTag(element)} is not an <input>, <textarea> or [contenteditable] element`,
	);
};

/**
 * Returns the value to write for `target`, normalized the way the browser
 * stores it. Throws when the browser would reject or alter the value, e.g. a
 * date not in YYYY-MM-DD or a range value off its min/max/step grid.
 */
export const prepareFillValue = (target: FillTarget, value: string): string => {
	if (target.kind === "rich") return value;

	const input = target.element;
	if (input instanceof HTMLInputElement && input.type === "number") {
		const trimmed = value.trim();
		if (trimmed !== "" && Number.isNaN(Number(trimmed))) {
			throw new Error(`Cannot fill "${value}" into input[type=number]`);
		}
		return trimmed;
	}
	if (target.kind !== "value") return value;

	const type = target.element.type;
	const normalized =
		type === "color" ? value.trim().toLowerCase() : value.trim();
	const probe = document.createElement("input");
	probe.type = type;
	for (const attribute of [
		"min",
		"max",
		"step",
	]) {
		const attributeValue = target.element.getAttribute(attribute);
		if (attributeValue !== null) probe.setAttribute(attribute, attributeValue);
	}
	probe.value = normalized;
	if (probe.value !== normalized) {
		const becomes = probe.value
			? `the browser would store "${probe.value}"`
			: "the browser rejects it";
		throw new Error(
			`Malformed value "${value}" for input[type=${type}]: ${becomes}`,
		);
	}
	return normalized;
};

/** The target's current content, as compared by `verifyFillEffect`. */
export const readFillValue = (target: FillTarget): string =>
	target.kind === "rich"
		? getEditingHostText(target.element)
		: target.element.value;

/**
 * True when the fill took effect: the target holds exactly `value`, or its
 * content changed from `before` to something non-empty. The second case
 * accepts fields that reformat what was typed (input masks, auto-casing,
 * maxlength, editor autoformat); a framework that rejected the input leaves the
 * content at `before` and still fails.
 */
export const verifyFillEffect = (
	target: FillTarget,
	value: string,
	before: string,
): boolean => {
	const actual = readFillValue(target);
	const expected = target.kind === "rich" ? normalizeEditorText(value) : value;
	return actual === expected || (actual !== before && actual !== "");
};

/**
 * Fill strategy: clears the field and uses execCommand('insertText') so that
 * framework-level input handlers (e.g. React synthetic events) fire.
 */
export const fillTextExecCommand = async (
	element: HTMLInputElement | HTMLTextAreaElement,
	value: string,
): Promise<void> => {
	element.focus();
	element.select();
	document.execCommand("insertText", false, value);
};

const selectEditorContents = (host: HTMLElement): Selection => {
	host.focus();
	const selection = globalThis.getSelection();
	if (!selection) {
		throw new Error("No selection available in this document");
	}
	const range = document.createRange();
	range.selectNodeContents(host);
	selection.removeAllRanges();
	selection.addRange(range);
	return selection;
};

/**
 * Rich-text fill strategy: selects the editor's contents and replaces them via
 * execCommand, which runs the browser's own editing pipeline so editors that
 * observe DOM mutations (Quill, ProseMirror) sync their models. Each line break
 * becomes a paragraph, because "\n" inside insertText is handled
 * inconsistently across editors.
 */
export const fillRichTextExecCommand = (
	host: HTMLElement,
	value: string,
): void => {
	selectEditorContents(host);
	if (value === "") {
		document.execCommand("delete");
		return;
	}
	value.split(/\r?\n/).forEach((line, index) => {
		if (index > 0) document.execCommand("insertParagraph");
		if (line) document.execCommand("insertText", false, line);
	});
};

/**
 * Rich-text fill strategy for when execCommand is unavailable: offers the text
 * as a cancelable `beforeinput` so editors that own their model can apply it,
 * and otherwise replaces the selected contents directly and reports an `input`.
 */
export const fillRichTextInputEvents = (
	host: HTMLElement,
	value: string,
): void => {
	const selection = selectEditorContents(host);
	const eventInit: InputEventInit = {
		inputType: "insertText",
		data: value,
		bubbles: true,
		composed: true,
	};
	const notCancelled = host.dispatchEvent(
		new InputEvent("beforeinput", {
			...eventInit,
			cancelable: true,
		}),
	);
	if (!notCancelled) return;

	const range = selection.getRangeAt(0);
	range.deleteContents();
	const fragment = document.createDocumentFragment();
	value.split(/\r?\n/).forEach((line, index) => {
		if (index > 0) fragment.append(document.createElement("br"));
		fragment.append(document.createTextNode(line));
	});
	range.insertNode(fragment);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
	host.dispatchEvent(new InputEvent("input", eventInit));
};

/**
 * Fill strategy: sets the value directly via the native prototype setter then
 * dispatches input + change events. Works even when execCommand is disabled.
 */
export const fillTextNativeSetter = (
	el: HTMLInputElement | HTMLTextAreaElement,
	value: string,
): void => {
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

export const hitEnterOnElement = async (element: HTMLElement) => {
	focusOnElement(element);
	await dispatchEnter(element);
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
