import type { FetchedResource } from "./fetch-resources";

/** Same `url()` pattern as collection, used here for rewriting. */
const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

const EXTENSION_BY_MIME: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/avif": "avif",
	"image/svg+xml": "svg",
	"image/x-icon": "ico",
	"image/vnd.microsoft.icon": "ico",
	"text/css": "css",
	"font/woff2": "woff2",
	"font/woff": "woff",
};

/**
 * Stable short hash of a URL, used to name asset files inside a ZIP without
 * leaking long query strings or colliding across origins.
 */
export const hashUrl = (url: string): string => {
	let hash = 2166136261;
	for (let index = 0; index < url.length; index += 1) {
		hash ^= url.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
};

export const extensionForMime = (mimeType: string): string =>
	EXTENSION_BY_MIME[mimeType] ?? "bin";

export const assetPathFor = (resource: FetchedResource): string =>
	`assets/${hashUrl(resource.absoluteUrl)}.${extensionForMime(resource.mimeType)}`;

const BASE64_CHUNK = 0x8000;

/** Chunked to avoid blowing the argument limit on large binaries. */
export const toBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	for (let index = 0; index < bytes.length; index += BASE64_CHUNK) {
		binary += String.fromCharCode(
			...bytes.subarray(index, index + BASE64_CHUNK),
		);
	}
	return btoa(binary);
};

export const toDataUri = (resource: FetchedResource): string =>
	`data:${resource.mimeType};base64,${toBase64(resource.bytes)}`;

/**
 * Rewrite every `url()` in a stylesheet to whatever `resolve` returns for the
 * absolute target.
 *
 * When a target could not be embedded the reference is still rewritten, to its
 * absolute form. Leaving it as-authored would turn a protocol-relative
 * `//host/x.png` into `file://host/x.png` once the artifact is opened from
 * disk — a silently broken link. Absolute keeps it honest.
 */
export const rewriteCssUrls = (
	cssText: string,
	baseUrl: string,
	resolve: (absoluteUrl: string) => string | undefined,
): string =>
	cssText.replace(CSS_URL_PATTERN, (match, _quote: string, raw: string) => {
		if (raw.startsWith("data:") || raw.startsWith("#")) {
			return match;
		}
		let absolute: string;
		try {
			absolute = new URL(raw, baseUrl).toString();
		} catch {
			return match;
		}
		return `url("${resolve(absolute) ?? absolute}")`;
	});

/**
 * Point every `<img>` at its embedded copy, falling back to the absolute URL
 * when the image could not be embedded (see `rewriteCssUrls` for why absolute
 * rather than as-authored).
 *
 * `srcset` is dropped because v1 does not embed responsive variants, and
 * leaving it would let the browser prefer an unembedded candidate over the
 * `src` we just rewrote. `loading` is dropped so nothing defers forever in a
 * page that is no longer scrollable in the same way.
 */
export const rewriteImageSources = (
	doc: Document,
	baseUrl: string,
	resolve: (absoluteUrl: string) => string | undefined,
): void => {
	for (const image of doc.querySelectorAll<HTMLImageElement>("img[src]")) {
		const raw = image.getAttribute("src");
		image.removeAttribute("srcset");
		image.removeAttribute("loading");

		if (!raw || raw.startsWith("data:")) {
			continue;
		}
		try {
			const absolute = new URL(raw, baseUrl).toString();
			image.setAttribute("src", resolve(absolute) ?? absolute);
		} catch {
			// Leave unparseable references untouched.
		}
	}

	// <source> inside <picture> would otherwise win over the rewritten <img>.
	for (const source of doc.querySelectorAll("picture source")) {
		source.remove();
	}
};
