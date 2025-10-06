import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
} from "@mcp-browser-kit/core-extension/types";
import { createPrefixId } from "@mcp-browser-kit/utils";
import parseDataUrl from "data-urls";
import { imageDimensionsFromData } from "image-dimensions";
import { Base64 } from "js-base64";
import browser from "webextension-polyfill";
import { getBrowserInfoPolyfill } from "./browser-info-polyfill";
import { LocalStorageKeys } from "./storage-keys";

const extensionInstanceId = createPrefixId("extension");

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

export const closeTab = async (tabId: string): Promise<void> => {
	await browser.tabs.remove(Number.parseInt(tabId));
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

export const getBrowserId = async (): Promise<string> => {
	const storageKey = LocalStorageKeys.ExtensionInstanceId;

	try {
		const result = await browser.storage.local.get(storageKey);

		if (result[storageKey]) {
			return result[storageKey] as string;
		}

		// Generate new ID if not found
		const newInstanceId = extensionInstanceId.generate();
		await browser.storage.local.set({
			[storageKey]: newInstanceId,
		});

		return newInstanceId;
	} catch (error) {
		console.error("Failed to get/set extension instance ID:", error);
		// Fallback to generating a new ID without storing it
		return extensionInstanceId.generate();
	}
};

export const getTabs = async () => {
	const tabs = await browser.tabs.query({});

	return tabs.map((tab) => ({
		id: tab.id?.toString() ?? "",
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
		windowId: Number.parseInt(windowId),
	});

	return {
		tabId: tab.id?.toString() ?? "",
		windowId: tab.windowId?.toString() ?? "",
	};
};
