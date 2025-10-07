import type { Func } from "@mcp-browser-kit/types";
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
