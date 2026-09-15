import type { FetchedResource } from "./fetch-resources";

export interface PreparedDocument {
	doc: Document;
	byUrl: Map<string, FetchedResource>;
}

/**
 * Clone the live document and strip what must never survive into the artifact:
 * scripts (they are inert offline and account for a large share of page
 * weight) and any pre-existing `<base>` (which would re-point relative URLs at
 * the original origin once the file is opened from disk).
 */
export const prepareDocument = (
	source: Document,
	resources: FetchedResource[],
): PreparedDocument => {
	const doc = source.cloneNode(true) as Document;

	for (const script of doc.querySelectorAll("script")) {
		script.remove();
	}
	for (const base of doc.querySelectorAll("base")) {
		base.remove();
	}
	// Preload/prefetch hints only trigger network requests that cannot succeed.
	for (const link of doc.querySelectorAll(
		'link[rel~="preload"], link[rel~="prefetch"], link[rel~="preconnect"], link[rel~="dns-prefetch"]',
	)) {
		link.remove();
	}

	const byUrl = new Map<string, FetchedResource>();
	for (const resource of resources) {
		byUrl.set(resource.absoluteUrl, resource);
	}

	return {
		doc,
		byUrl,
	};
};

/** Record the page's original address so the artifact stays traceable. */
export const stampSourceUrl = (doc: Document, sourceUrl: string): void => {
	const comment = doc.createComment(
		` Saved by MCP Browser Kit from ${sourceUrl} on ${new Date().toISOString()} `,
	);
	doc.documentElement.insertBefore(comment, doc.documentElement.firstChild);
};

export const serializeDocument = (doc: Document): string =>
	`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
