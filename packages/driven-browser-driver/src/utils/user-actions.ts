import type { Tab } from "@mcp-browser-kit/core-server";
import type { Func } from "@mcp-browser-kit/types";
import parseDataURL from "data-urls";
import { imageDimensionsFromData } from "image-dimensions";
import { Base64 } from "js-base64";

export const toIIFE = (fn: Func | string) => {
	if (typeof fn === "function") {
		return `(${fn.toString()})()`;
	}

	return `(()=>{${fn}})()`;
};

export const getExecuteScriptResult = async <T = void>(results: unknown[]) => {
	if (!Array.isArray(results)) {
		throw new Error("Invalid results");
	}

	return results[0] as T;
};

export const getTabs = async () => {
	const tabs = await browser.tabs.query({});

	return tabs.map((tab) => ({
		id: tab.id?.toString() ?? "",
		title: tab.title ?? "",
		url: tab.url ?? "",
		active: tab.active ?? false,
	})) as Tab[];
};

function _getReadableElements() {
	const labeledElements = document.querySelectorAll("[aria-label]");
	const placeholderElements = document.querySelectorAll(
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
}

function _elementsToTable(elements: HTMLElement[]) {
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
}

export const getReadableElements = async (tabId: string) => {
	const code = toIIFE(`
		${_getReadableElements.toString()}
		${_elementsToTable.toString()}
		return _elementsToTable(_getReadableElements());
		`);
	const results = await browser.tabs.executeScript(+tabId, {
		code,
	});
	return getExecuteScriptResult<[number, string, string][]>(results);
};

export const clickOnReadableElement = async (tabId: string, index: number) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			${_getReadableElements.toString()};
			const elements = _getReadableElements();
			const element = elements[${index}];
			$mcpBrowserKit.playClickAnimationOnElement(element);
			element.click();
		`),
	});

	return getExecuteScriptResult(results);
};

export const fillTextToReadableElement = async (
	tabId: string,
	index: number,
	value: string,
) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			${_getReadableElements.toString()};
			const elements = _getReadableElements();
			const element = elements[${index}];
			$mcpBrowserKit.playClickAnimationOnElement(element);
			element.value = "${value}";
		`),
	});
	return getExecuteScriptResult(results);
};

export const getInnerText = async (tabId: string) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			return document.body.innerText;
		`),
	});

	return getExecuteScriptResult<string>(results);
};

export const captureActiveTab = async () => {
	const dataUrl = await browser.tabs.captureVisibleTab();
	const parsed = parseDataURL(dataUrl);

	if (!parsed?.body) {
		throw new Error("Failed to parse data URL or body is undefined.");
	}

	const dimensions = await imageDimensionsFromData(parsed.body);

	if (!dimensions) {
		throw new Error("Failed to retrieve image dimensions.");
	}

	return {
		data: Base64.fromUint8Array(parsed.body),
		mimeType: parsed.mimeType.toString(),
		width: dimensions.width,
		height: dimensions.height,
	};
};

export const clickOnViewableElement = async (
	tabId: string,
	x: number,
	y: number,
) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			$mcpBrowserKit.playClickAnimation(${x}, ${y});
			const element = document.elementFromPoint(${x}, ${y});
			if (element) {
				element.click();
			}
		`),
	});
	return getExecuteScriptResult(results);
};

export const fillTextToViewableElement = async (
	tabId: string,
	x: number,
	y: number,
	value: string,
) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			$mcpBrowserKit.playClickAnimation(${x}, ${y});
			const element = document.elementFromPoint(${x}, ${y});
			if (element) {
				element.value = "${value}";
			}
		`),
	});
	return getExecuteScriptResult(results);
};

export const invokeJsFn = async (tabId: string, fnCode: string) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(fnCode),
	});

	return getExecuteScriptResult(results);
};
