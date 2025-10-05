import browser from "webextension-polyfill";
import {
	type GetTool,
	type ToolKeys,
	tabToolsIdentifier,
} from "../helpers/tab-tools-setup";

export const getExecuteScriptResult = async <T = void>(results: unknown[]) => {
	if (!Array.isArray(results)) {
		throw new Error("Invalid results");
	}

	return results[0] as T;
};

export const executeTabToolM2 = async <T extends ToolKeys>(
	tabId: string,
	tool: T,
	...args: Parameters<GetTool<T>>
): Promise<Awaited<ReturnType<GetTool<T>>>> => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: `${tabToolsIdentifier}.callTool.apply(undefined, ${JSON.stringify([
			tool,
			args,
		])})`,
	});

	return getExecuteScriptResult<Awaited<ReturnType<GetTool<T>>>>(results);
};
