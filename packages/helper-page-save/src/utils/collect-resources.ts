/**
 * A subresource referenced by the page that should be embedded in the saved
 * artifact. `absoluteUrl` is resolved against the document base URL; `kind`
 * decides the file extension used in ZIP output.
 */
export interface ResourceRef {
	absoluteUrl: string;
	kind: "image" | "stylesheet" | "css-asset";
}

const IMAGE_SELECTOR = "img[src]";
const STYLESHEET_SELECTOR = 'link[rel~="stylesheet"][href]';

/** `url(...)` occurrences inside a stylesheet, capturing the raw reference. */
const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/**
 * A URL that is already self-contained (or unfetchable) and must be left alone.
 */
const isInlineUrl = (url: string): boolean =>
	url.startsWith("data:") ||
	url.startsWith("blob:") ||
	url.startsWith("about:") ||
	url.startsWith("#");

const toAbsoluteUrl = (raw: string, baseUrl: string): string | undefined => {
	if (!raw || isInlineUrl(raw)) {
		return undefined;
	}
	try {
		return new URL(raw, baseUrl).toString();
	} catch {
		return undefined;
	}
};

/** Extract every `url()` target from a stylesheet body, resolved absolutely. */
export const collectCssUrls = (cssText: string, baseUrl: string): string[] => {
	const urls: string[] = [];
	for (const match of cssText.matchAll(CSS_URL_PATTERN)) {
		const absolute = toAbsoluteUrl(match[2] ?? "", baseUrl);
		if (absolute) {
			urls.push(absolute);
		}
	}
	return urls;
};

/**
 * Walk the document for the subresources v1 supports: images, linked
 * stylesheets, and `url()` targets inside inline `<style>` blocks.
 *
 * `url()` targets inside *linked* stylesheets are discovered later, once that
 * stylesheet has actually been fetched (see `fetchResources`).
 *
 * Deliberately out of scope: fonts, `srcset`/`<picture>`, and iframes.
 */
export const collectResources = (doc: Document): ResourceRef[] => {
	const baseUrl = doc.baseURI;
	const seen = new Set<string>();
	const resources: ResourceRef[] = [];

	const push = (raw: string, kind: ResourceRef["kind"]): void => {
		const absoluteUrl = toAbsoluteUrl(raw, baseUrl);
		if (!absoluteUrl || seen.has(absoluteUrl)) {
			return;
		}
		seen.add(absoluteUrl);
		resources.push({
			absoluteUrl,
			kind,
		});
	};

	for (const image of doc.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)) {
		push(image.getAttribute("src") ?? "", "image");
	}

	for (const link of doc.querySelectorAll<HTMLLinkElement>(
		STYLESHEET_SELECTOR,
	)) {
		push(link.getAttribute("href") ?? "", "stylesheet");
	}

	for (const style of doc.querySelectorAll<HTMLStyleElement>("style")) {
		for (const url of collectCssUrls(style.textContent ?? "", baseUrl)) {
			push(url, "css-asset");
		}
	}

	return resources;
};
