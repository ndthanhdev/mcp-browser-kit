import type { PageSaveFormat } from "@mcp-browser-kit/core-extension/types";

const MAX_STEM_LENGTH = 80;

const slugify = (value: string): string =>
	value
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_STEM_LENGTH)
		.toLowerCase();

const fromUrl = (sourceUrl: string): string => {
	try {
		const url = new URL(sourceUrl);
		const path = url.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
		return slugify(path ? `${url.hostname}-${path}` : url.hostname);
	} catch {
		return "";
	}
};

/**
 * Name the artifact after the page title, falling back to host and path.
 *
 * The agent cannot choose the filename: a blob download has no URL for the
 * browser to derive a name from, so an explicit one is always required, and
 * the page's own title is what a human would pick anyway.
 */
export const deriveFilename = (
	title: string,
	sourceUrl: string,
	format: PageSaveFormat,
): string => {
	const stem = slugify(title) || fromUrl(sourceUrl) || "page";
	return `${stem}.${format === "zip" ? "zip" : "html"}`;
};
