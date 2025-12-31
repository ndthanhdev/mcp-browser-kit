import type { Func } from "@mcp-browser-kit/types";
import { parse as parseDataUrl } from "@readme/data-urls";
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

	if (!parsed) {
		throw new Error("Failed to parse data URL.");
	}

	const buffer = parsed.toBuffer();
	const dimensions = await imageDimensionsFromData(buffer);

	if (!dimensions) {
		throw new Error("Failed to retrieve image dimensions.");
	}

	return {
		data: Base64.fromUint8Array(new Uint8Array(buffer)),
		mimeType: parsed.contentType || parsed.mediaType || "image/png",
		width: dimensions.width,
		height: dimensions.height,
	};
};
