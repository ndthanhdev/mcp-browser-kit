/**
 * List of browser internal URL protocols that should not be navigated to
 */
const BROWSER_INTERNAL_PROTOCOLS = [
	"chrome:",
	"chrome-extension:",
	"chrome-search:",
	"chrome-devtools:",
	"devtools:",
	"edge:",
	"about:",
	"moz-extension:",
	"resource:",
	"view-source:",
	"data:",
	"javascript:",
	"file:",
] as const;

/**
 * Checks if a URL is a browser internal page that cannot be controlled
 * or should not be navigated to by automation tools.
 *
 * @param url - The URL to check
 * @returns true if the URL is a browser internal page, false otherwise
 *
 * @example
 * ```ts
 * isBrowserInternalUrl("chrome://settings") // true
 * isBrowserInternalUrl("about:blank") // true
 * isBrowserInternalUrl("https://example.com") // false
 * ```
 */
export function isBrowserInternalUrl(url: string): boolean {
	if (!url || typeof url !== "string") {
		return false;
	}

	const normalizedUrl = url.trim().toLowerCase();

	// Check if URL starts with any browser internal protocol
	return BROWSER_INTERNAL_PROTOCOLS.some((protocol) =>
		normalizedUrl.startsWith(protocol),
	);
}
