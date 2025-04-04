import DOMPurify from "dompurify";
import type { Tab } from "@mcp-browser-kit/server/services/tab-service";
import { addDevTool } from "./add-dev-tool";

export const toIIFE = (fn: Function | string) => {
	if (typeof fn === "function") {
		return `(${fn.toString()})()`;
	}

	return `(()=>{${fn}})()`;
};

export const getExecuteScriptResult = async <T = any>(results: any[]) => {
	if (!Array.isArray(results)) {
		return undefined;
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
		":not([aria-label])[placeholder]"
	);
	const buttonsWithText = Array.from(
		document.querySelectorAll(`button:not([aria-label])`)
	).filter((el) => {
		const text = el.innerText;
		return text && text.trim() !== "";
	});
	const linksWithText = Array.from(
		document.querySelectorAll(`a:not([aria-label])`)
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
		])
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

export const clickOnIndex = async (tabId: string, index: number) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			${_getReadableElements.toString()};
			_getReadableElements()[${index}].click();`),
	});

	return getExecuteScriptResult(results);
};

export const fillTextToIndex = async (
	tabId: string,
	index: number,
	value: string
) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(`
			${_getReadableElements.toString()};
			const elements = _getReadableElements();
			const element = elements[${index}];
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

export const invokeJsFn = async (tabId: string, fnCode: string) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(fnCode),
	});

	return getExecuteScriptResult(results);
};

addDevTool({
	getTabs,
	getInnerText,
	getReadableElements,
	clickOnIndex,
	fillTextToIndex,
	invokeJsFn,
});
