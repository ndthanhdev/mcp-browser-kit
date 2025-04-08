import type { Tab } from "@mcp-browser-kit/core-server";
import type { Func } from "@mcp-browser-kit/types";
import parseDataUrl from "data-urls";
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

export const captureActiveTab = async () => {
	const dataUrl = await browser.tabs.captureVisibleTab();
	const parsed = parseDataUrl(dataUrl);

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

export const invokeJsFn = async (tabId: string, fnCode: string) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIIFE(fnCode),
	});

	return getExecuteScriptResult(results);
};
