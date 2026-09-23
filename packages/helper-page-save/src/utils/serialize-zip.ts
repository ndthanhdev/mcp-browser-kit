import { zipSync } from "fflate";
import type { FetchedResource } from "./fetch-resources";
import {
	prepareDocument,
	serializeDocument,
	stampSourceUrl,
} from "./prepare-document";
import { assetPathFor, rewriteCssUrls, rewriteImageSources } from "./rewrite";

/** Depth of `assets/x.png` relative to a stylesheet also inside `assets/`. */
const assetRelativeToAsset = (path: string): string =>
	path.replace(/^assets\//, "");

/**
 * Produce a ZIP containing `index.html` plus an `assets/` directory of real
 * binary files, with every reference rewritten to a relative path.
 *
 * Preferred over the HTML format for large pages: binaries stay binary (no
 * base64 premium) and the text compresses, while the extracted folder stays
 * browsable and greppable.
 */
export const serializeZip = (
	source: Document,
	resources: FetchedResource[],
	sourceUrl: string,
): Uint8Array => {
	const { doc, byUrl } = prepareDocument(source, resources);

	const resolveToAssetPath = (absoluteUrl: string): string | undefined => {
		const resource = byUrl.get(absoluteUrl);
		return resource ? assetPathFor(resource) : undefined;
	};

	const files: Record<string, Uint8Array> = {};

	rewriteImageSources(doc, sourceUrl, resolveToAssetPath);

	// Linked stylesheets become files under assets/, so their own url()
	// references resolve relative to that directory rather than the root.
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
		const path = assetPathFor(resource);
		files[path] = new TextEncoder().encode(
			rewriteCssUrls(resource.text, absolute, (assetUrl) => {
				const target = resolveToAssetPath(assetUrl);
				return target === undefined ? undefined : assetRelativeToAsset(target);
			}),
		);
		link.setAttribute("href", path);
	}

	// Inline <style> stays at document root, so it uses full assets/ paths.
	for (const style of doc.querySelectorAll<HTMLStyleElement>("style")) {
		style.textContent = rewriteCssUrls(
			style.textContent ?? "",
			sourceUrl,
			resolveToAssetPath,
		);
	}

	for (const resource of resources) {
		if (resource.kind === "stylesheet") {
			// Already written above with rewritten text.
			continue;
		}
		files[assetPathFor(resource)] = resource.bytes;
	}

	stampSourceUrl(doc, sourceUrl);
	files["index.html"] = new TextEncoder().encode(serializeDocument(doc));

	return zipSync(files, {
		level: 6,
	});
};
