import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
} from "@mcp-browser-kit/core-extension/types";
import browser from "webextension-polyfill";
import { getBrowserInfoPolyfill } from "./browser-info-polyfill";

export const closeTab = async (tabId: string): Promise<void> => {
	await browser.tabs.remove(Number.parseInt(tabId, 10));
};

export const getBrowserInfo = async (): Promise<BrowserInfo> => {
	const browserInfo = await getBrowserInfoPolyfill();

	return {
		browserName: browserInfo.name,
		browserVersion: browserInfo.version,
	};
};

export const getExtensionInfo = async (): Promise<ExtensionInfo> => {
	const manifest = browser.runtime.getManifest();

	if (!browser.runtime.id) {
		throw new Error("Extension ID is not available");
	}

	if (!manifest.version) {
		throw new Error("Extension version is not available in manifest");
	}

	if (manifest.manifest_version == null) {
		throw new Error("Manifest version is not available in manifest");
	}

	return {
		extensionId: browser.runtime.id,
		extensionVersion: manifest.version,
		manifestVersion: manifest.manifest_version,
	};
};

export const getBrowserId = (): Promise<string> => {
	if (!browser.runtime.id) {
		return Promise.reject(new Error("Extension ID is not available"));
	}
	return Promise.resolve(browser.runtime.id);
};

export const getTabs = async () => {
	const tabs = await browser.tabs.query({});

	return tabs.map((tab) => ({
		id: tab.id?.toString() ?? "",
		windowId: tab.windowId?.toString() ?? "",
		title: tab.title ?? "",
		url: tab.url ?? "",
		active: tab.active ?? false,
	})) as ExtensionTabInfo[];
};

export const getWindows = async (): Promise<ExtensionWindowInfo[]> => {
	const windows = await browser.windows.getAll();
	return windows.map((window) => ({
		id: window.id?.toString() ?? "",
		focused: window.focused ?? false,
	}));
};

export const openTab = async (
	url: string,
	windowId: string,
): Promise<{
	tabId: string;
	windowId: string;
}> => {
	const tab = await browser.tabs.create({
		url,
		windowId: Number.parseInt(windowId, 10),
	});

	return {
		tabId: tab.id?.toString() ?? "",
		windowId: tab.windowId?.toString() ?? "",
	};
};
