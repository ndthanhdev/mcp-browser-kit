import type { ExtensionTabInfo } from "@mcp-browser-kit/core-extension/types";
import parseDataUrl from "data-urls";
import { imageDimensionsFromData } from "image-dimensions";
import { Base64 } from "js-base64";
import browser from "webextension-polyfill";

export const getTabs = async () => {
	const tabs = await browser.tabs.query({});

	return tabs.map((tab) => ({
		id: tab.id?.toString() ?? "",
		title: tab.title ?? "",
		url: tab.url ?? "",
		active: tab.active ?? false,
	})) as ExtensionTabInfo[];
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
