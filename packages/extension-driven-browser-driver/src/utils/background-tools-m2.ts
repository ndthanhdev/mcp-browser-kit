import type { Func } from "@mcp-browser-kit/types";
import parseDataUrl from "data-urls";
import { imageDimensionsFromData } from "image-dimensions";
import { Base64 } from "js-base64";
import browser from "webextension-polyfill";

export const toIife = (fn: Func | string) => {
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

export const invokeJsFn = async (tabId: string, fnCode: string) => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: toIife(fnCode),
	});

	return getExecuteScriptResult(results);
};

export const captureTab = async (_tabId: string) => {
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
