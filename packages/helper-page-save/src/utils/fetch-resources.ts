import type {
	PageSaveSkippedResource,
	PageSaveSkipReason,
} from "@mcp-browser-kit/core-extension/types";
import type { ResourceRef } from "./collect-resources";
import { collectCssUrls } from "./collect-resources";

export interface FetchedResource {
	absoluteUrl: string;
	kind: ResourceRef["kind"];
	mimeType: string;
	bytes: Uint8Array;
	/** Present only for stylesheets, whose text is rewritten before embedding. */
	text?: string;
}

export interface FetchResourcesOptions {
	maxResourceBytes: number;
	maxTotalBytes: number;
	signal: AbortSignal;
}

export interface FetchResourcesOutcome {
	fetched: FetchedResource[];
	skipped: PageSaveSkippedResource[];
}

/**
 * Cross-origin responses without permissive CORS headers throw a TypeError.
 * That is by far the most common failure and is worth reporting distinctly,
 * because it is the one the user can do nothing about.
 */
const classifyError = (error: unknown): PageSaveSkipReason => {
	if (error instanceof DOMException && error.name === "AbortError") {
		return "timeout";
	}
	if (error instanceof TypeError) {
		return "cors";
	}
	return "error";
};

const isStylesheetLike = (kind: ResourceRef["kind"]): boolean =>
	kind === "stylesheet";

/**
 * Fetch every referenced subresource from the page's own context, so cookies
 * and session state apply exactly as they did for the live page.
 *
 * Stylesheets are followed one level deep: their `url()` targets are queued as
 * additional resources, since those cannot be discovered from the DOM alone.
 * Failures never throw — they are recorded in `skipped` so a partial capture
 * still produces a usable file.
 */
export const fetchResources = async (
	resources: ResourceRef[],
	options: FetchResourcesOptions,
): Promise<FetchResourcesOutcome> => {
	const { maxResourceBytes, maxTotalBytes, signal } = options;
	const fetched: FetchedResource[] = [];
	const skipped: PageSaveSkippedResource[] = [];

	const queue = [
		...resources,
	];
	const seen = new Set(queue.map((resource) => resource.absoluteUrl));
	let totalBytes = 0;

	while (queue.length > 0) {
		const resource = queue.shift();
		if (!resource) {
			break;
		}

		try {
			// Credentials are deliberately left at the fetch default
			// ("same-origin"). Sending them cross-origin would make every server
			// using a wildcard `Access-Control-Allow-Origin: *` reject the
			// request, which silently loses most third-party images. Same-origin
			// assets still get the page's cookies, which is the case that
			// actually needs them.
			const response = await fetch(resource.absoluteUrl, {
				signal,
			});
			if (!response.ok) {
				skipped.push({
					url: resource.absoluteUrl,
					reason: "error",
				});
				continue;
			}

			const buffer = await response.arrayBuffer();
			const bytes = new Uint8Array(buffer);

			if (bytes.byteLength > maxResourceBytes) {
				skipped.push({
					url: resource.absoluteUrl,
					reason: "too-large",
				});
				continue;
			}

			totalBytes += bytes.byteLength;
			if (totalBytes > maxTotalBytes) {
				throw new Error(
					`Page exceeds the ${maxTotalBytes} byte capture limit; try format "zip" or save a smaller page.`,
				);
			}

			const mimeType =
				response.headers.get("content-type")?.split(";")[0]?.trim() ||
				"application/octet-stream";

			const entry: FetchedResource = {
				absoluteUrl: resource.absoluteUrl,
				kind: resource.kind,
				mimeType,
				bytes,
			};

			if (isStylesheetLike(resource.kind)) {
				const text = new TextDecoder().decode(bytes);
				entry.text = text;
				// Queue assets referenced from within this stylesheet.
				for (const url of collectCssUrls(text, resource.absoluteUrl)) {
					if (!seen.has(url)) {
						seen.add(url);
						queue.push({
							absoluteUrl: url,
							kind: "css-asset",
						});
					}
				}
			}

			fetched.push(entry);
		} catch (error) {
			if (error instanceof Error && error.message.includes("capture limit")) {
				throw error;
			}
			skipped.push({
				url: resource.absoluteUrl,
				reason: classifyError(error),
			});
		}
	}

	return {
		fetched,
		skipped,
	};
};
