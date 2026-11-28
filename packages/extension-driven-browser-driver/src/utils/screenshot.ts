import type { Screenshot } from "@mcp-browser-kit/core-extension/types";
import { imageDimensionsFromData } from "image-dimensions";
import { Base64 } from "js-base64";

const BASE64_DATA_URL = /^data:([^;,]+)(?:;[^;,]+)*;base64,/i;

/**
 * Turn the base64 data URL returned by `tabs.captureVisibleTab` into a
 * `Screenshot`. Uses only Web APIs: Node's `Buffer` is not available in the
 * extension background context.
 */
export const screenshotFromDataUrl = (dataUrl: string): Screenshot => {
	const match = BASE64_DATA_URL.exec(dataUrl);
	if (!match) {
		throw new Error("Failed to parse data URL: expected a base64 image.");
	}

	const data = dataUrl.slice(match[0].length);
	const dimensions = imageDimensionsFromData(Base64.toUint8Array(data));
	if (!dimensions) {
		throw new Error("Failed to retrieve image dimensions.");
	}

	return {
		data,
		mimeType: match[1].toLowerCase(),
		width: dimensions.width,
		height: dimensions.height,
	};
};
