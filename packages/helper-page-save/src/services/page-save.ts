import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	PageSaveOptions,
	PageSaveResult,
} from "@mcp-browser-kit/core-extension/types";
import { inject, injectable } from "inversify";
import { collectResources } from "../utils/collect-resources";
import { deriveFilename } from "../utils/derive-filename";
import { fetchResources } from "../utils/fetch-resources";
import { serializeHtml } from "../utils/serialize-html";
import { serializeZip } from "../utils/serialize-zip";

const DEFAULT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_RESOURCE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20_000;

export interface PageSaveCapture {
	blob: Blob;
	meta: PageSaveResult;
}

/**
 * Captures the live document as a self-contained artifact.
 *
 * Runs entirely in the page context: subresources are fetched with the page's
 * own credentials, so authenticated images and stylesheets resolve exactly as
 * they did on screen. Uses no privileged extension API, which is what lets it
 * work identically on Chrome and Firefox, MV2 and MV3.
 *
 * Known limits in v1: fonts, `srcset`/`<picture>` and iframes are not
 * embedded, and cross-origin resources without permissive CORS headers cannot
 * be read at all. Both are reported through `PageSaveResult.skipped` rather
 * than failing the capture.
 */
@injectable()
export class PageSave {
	private readonly logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("PageSave");
	}

	capture = async (
		doc: Document,
		options: PageSaveOptions,
	): Promise<PageSaveCapture> => {
		const {
			format,
			maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
			maxResourceBytes = DEFAULT_MAX_RESOURCE_BYTES,
			timeoutMs = DEFAULT_TIMEOUT_MS,
		} = options;

		const sourceUrl = doc.baseURI;
		this.logger.verbose(`Capturing page as ${format}: ${sourceUrl}`);

		const resources = collectResources(doc);
		this.logger.verbose(`Found ${resources.length} referenced resources`);

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, timeoutMs);

		let fetched: Awaited<ReturnType<typeof fetchResources>>;
		try {
			fetched = await fetchResources(resources, {
				maxResourceBytes,
				maxTotalBytes,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeout);
		}

		const bytes =
			format === "zip"
				? serializeZip(doc, fetched.fetched, sourceUrl)
				: new TextEncoder().encode(
						serializeHtml(doc, fetched.fetched, sourceUrl),
					);

		if (bytes.byteLength > maxTotalBytes) {
			throw new Error(
				`Saved page is ${bytes.byteLength} bytes, over the ${maxTotalBytes} byte limit.`,
			);
		}

		const filename = deriveFilename(doc.title, sourceUrl, format);
		const blob = new Blob(
			[
				bytes as unknown as BlobPart,
			],
			{
				type: format === "zip" ? "application/zip" : "text/html;charset=utf-8",
			},
		);

		this.logger.info(
			`Captured ${filename} (${bytes.byteLength} bytes, ${fetched.fetched.length} resources, ${fetched.skipped.length} skipped)`,
		);

		return {
			blob,
			meta: {
				filename,
				bytes: bytes.byteLength,
				format,
				resourceCount: fetched.fetched.length,
				skipped: fetched.skipped,
			},
		};
	};
}
