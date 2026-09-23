import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	PageSaveFormat,
	PageSaveResult,
} from "@mcp-browser-kit/core-extension/types";
import { PageSave } from "@mcp-browser-kit/helper-page-save";
import type { Logger } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";

/**
 * Content-script surface for saving the current page to disk.
 *
 * The download is triggered here rather than from the background context on
 * purpose. The bytes are produced in the page, and a blob URL minted in the
 * page's origin cannot be fetched by the extension origin — so handing this to
 * `downloads.download` would mean chunking megabytes through JSON messaging,
 * and would still fail under MV3 where the service worker has no
 * `URL.createObjectURL`. Saving from here needs no `downloads` permission and
 * behaves identically on Chrome and Firefox, MV2 and MV3.
 */
@injectable()
export class TabPageSaveTools {
	private readonly logger: Logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(PageSave)
		private readonly pageSave: PageSave,
	) {
		this.logger = loggerFactory.create("TabPageSaveTools");
	}

	savePage = async (format: PageSaveFormat): Promise<PageSaveResult> => {
		this.logger.verbose(`Saving page as ${format}`);

		const { blob, meta } = await this.pageSave.capture(document, {
			format,
		});

		this.triggerDownload(blob, meta.filename);

		this.logger.info(
			`Saved page as ${meta.filename} (${meta.bytes} bytes, ${meta.skipped.length} resources skipped)`,
		);
		return meta;
	};

	/**
	 * Hand the artifact to the browser's download machinery via a synthetic
	 * anchor click. The object URL is revoked on the next tick, once the
	 * browser has taken its own reference to the blob.
	 */
	private triggerDownload = (blob: Blob, filename: string): void => {
		const objectUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = objectUrl;
		anchor.download = filename;
		anchor.rel = "noopener";
		anchor.style.display = "none";

		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();

		setTimeout(() => {
			URL.revokeObjectURL(objectUrl);
		}, 0);
	};
}
