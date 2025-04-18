import * as R from "ramda";
import browser from "webextension-polyfill";
import {
	type GetTool,
	type ToolKeys,
	contentToolsIdentifier,
} from "./setup-content-tools";

export const getExecuteScriptResult = async <T = void>(results: unknown[]) => {
	if (!Array.isArray(results)) {
		throw new Error("Invalid results");
	}

	return results[0] as T;
};

export const executeContentTool = async <T extends ToolKeys>(
	tabId: string,
	tool: T,
	...args: Parameters<GetTool<T>>
): Promise<Awaited<ReturnType<GetTool<T>>>> => {
	const results = await browser.tabs.executeScript(+tabId, {
		code: `${contentToolsIdentifier}.${tool}.apply(undefined, ${JSON.stringify(
			args,
		)})`,
	});

	return getExecuteScriptResult<Awaited<ReturnType<GetTool<T>>>>(results);
};

export const executeContentToolM3 = async <T extends ToolKeys>(
	tabId: string,
	tool: T,
	...args: Parameters<GetTool<T>>
): Promise<Awaited<ReturnType<GetTool<T>>>> => {
	const response = await browser.tabs.sendMessage(+tabId, {
		type: "execute-tool",
		tool,
		args,
	});

	return response as Awaited<ReturnType<GetTool<T>>>;
};
