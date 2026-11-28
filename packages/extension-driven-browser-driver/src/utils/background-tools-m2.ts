import type { Func } from "@mcp-browser-kit/types";
import browser from "webextension-polyfill";
import { screenshotFromDataUrl } from "./screenshot";

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
	const results = await browser.tabs.executeScript(Number(tabId), {
		code: toIife(fnCode),
	});

	return getExecuteScriptResult(results);
};

/**
 * `captureVisibleTab` can only see the active tab of a window, so the target
 * tab is activated first; otherwise the screenshot would show a different page.
 */
export const captureTab = async (tabId: string) => {
	const tab = await browser.tabs.get(Number(tabId));
	if (!tab.active) {
		await browser.tabs.update(tab.id, {
			active: true,
		});
	}

	const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
		format: "png",
	});

	return screenshotFromDataUrl(dataUrl);
};
