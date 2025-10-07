import Bowser from "bowser";
import browser from "webextension-polyfill";

/**
 * Polyfill for browser.runtime.getBrowserInfo()
 *
 * Firefox supports browser.runtime.getBrowserInfo() natively,
 * but Chrome/Edge don't. This polyfill uses bowser to parse
 * the user agent string as a fallback.
 */
export async function getBrowserInfoPolyfill(): Promise<{
	name: string;
	version: string;
}> {
	// Try to use the native API if available (Firefox)
	if (typeof browser.runtime.getBrowserInfo === "function") {
		try {
			return await browser.runtime.getBrowserInfo();
		} catch (error) {
			console.warn(
				"browser.runtime.getBrowserInfo() failed, falling back to bowser:",
				error,
			);
		}
	}

	// Fallback to bowser for browsers that don't support getBrowserInfo (Chrome, Edge, etc.)
	const parser = Bowser.getParser(globalThis.navigator.userAgent);
	const browserInfo = parser.getBrowser();

	return {
		name: browserInfo.name || "Unknown",
		version: browserInfo.version || "Unknown",
	};
}
