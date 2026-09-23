import type { FetchedResource } from "./fetch-resources";
import {
	prepareDocument,
	serializeDocument,
	stampSourceUrl,
} from "./prepare-document";
import { rewriteCssUrls, rewriteImageSources, toDataUri } from "./rewrite";

/**
 * Produce a single self-contained HTML string with every subresource embedded
 * as a `data:` URI. Convenient (one file, opens by double-click) at the cost of
 * base64's ~33% size premium.
 */
export const serializeHtml = (
	source: Document,
	resources: FetchedResource[],
	sourceUrl: string,
): string => {
	const { doc, byUrl } = prepareDocument(source, resources);
	const resolveToDataUri = (absoluteUrl: string): string | undefined => {
		const resource = byUrl.get(absoluteUrl);
		return resource ? toDataUri(resource) : undefined;
	};

	rewriteImageSources(doc, sourceUrl, resolveToDataUri);

	// Replace each linked stylesheet with an inline <style> carrying its
	// rewritten text, so no external CSS request survives.
	for (const link of doc.querySelectorAll<HTMLLinkElement>(
		'link[rel~="stylesheet"][href]',
	)) {
		const raw = link.getAttribute("href");
		if (!raw) {
			continue;
		}
		let absolute: string;
		try {
			absolute = new URL(raw, sourceUrl).toString();
		} catch {
			continue;
		}
		const resource = byUrl.get(absolute);
		if (!resource?.text) {
			continue;
		}
		const style = doc.createElement("style");
		style.textContent = rewriteCssUrls(
			resource.text,
			absolute,
			resolveToDataUri,
		);
		link.replaceWith(style);
	}

	for (const style of doc.querySelectorAll<HTMLStyleElement>("style")) {
		style.textContent = rewriteCssUrls(
			style.textContent ?? "",
			sourceUrl,
			resolveToDataUri,
		);
	}

	stampSourceUrl(doc, sourceUrl);
	return serializeDocument(doc);
};
