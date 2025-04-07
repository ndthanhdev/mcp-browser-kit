import { playClickAnimationOnElement } from "./animation-tools";

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

export const generateElementRecords = (elements: HTMLElement[]) => {
	const table = elements.map((el, index) => {
		const tag = el.tagName.toLowerCase();
		const label =
			el.getAttribute("aria-label") ??
			el.getAttribute("placeholder") ??
			el.innerText ??
			"";
		return [index, tag, label] as [number, string, string];
	});
	return table;
};

export const getReadableElements = () => {
	return generateElementRecords(getReadableHtmlElements());
};

export const clickOnReadableElement = async (index: number) => {
	const readableElements = getReadableHtmlElements();
	const element = readableElements[index];
	playClickAnimationOnElement(element);
	element.click();
};

export const fillTextToReadableElement = (index: number, value: string) => {
	const readableElements = getReadableHtmlElements();
	const element = readableElements[index];
	playClickAnimationOnElement(element);
	(element as HTMLInputElement).value = value;
};

export const getInnerText = () => {
	return document.body.innerText;
};

export const clickOnViewableElement = (x: number, y: number) => {
	const element = document.elementFromPoint(x, y);
	if (element) {
		(element as HTMLButtonElement).click();
	}
};

export const fillTextToViewableElement = (
	x: number,
	y: number,
	value: string,
) => {
	const element = document.elementFromPoint(x, y);
	if (element) {
		(element as HTMLInputElement).value = value;
	}
};
