import type { TabContext } from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import { Readability } from "@mozilla/readability";
import { inject, injectable } from "inversify";
import { toDomTree } from "../utils/to-dom-tree";
import { toElementRecords } from "../utils/to-element-records";
import { domTreeToReadableTree } from "../utils/to-readable-tree";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";
import { TabDomTools } from "./tab-dom-tools";

/**
 * TabTools class provides access to browser automation tools.
 */
@injectable()
export class TabTools {
	public readonly animation: TabAnimationTools;
	public readonly dom: TabDomTools;
	private readonly contextStore: TabContextStore;
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabDomTools) dom: TabDomTools,
		@inject(TabAnimationTools) animation: TabAnimationTools,
		@inject(TabContextStore) contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabTools");
		this.dom = dom;
		this.animation = animation;
		this.contextStore = contextStore;
	}

	loadTabContext = async (): Promise<TabContext> => {
		this.logger.info("Loading tab context");

		// 1. Get root element from document
		const rootElement = document.documentElement;
		this.logger.verbose("Retrieved root element from document");

		// 2. Convert root element to DOM tree
		const domTree = toDomTree(rootElement);
		this.logger.verbose("Converted root element to DOM tree");

		// 3. Convert DOM tree to readable tree
		const readableTree = domTreeToReadableTree(domTree);
		this.logger.verbose(
			`Converted DOM tree to readable tree: ${readableTree ? "success" : "failed"}`,
		);

		// 4. Convert readable tree to element records
		const readableElementRecords = readableTree
			? toElementRecords(readableTree).slice(1)
			: [];
		this.logger.verbose(
			`Extracted ${readableElementRecords.length} readable element records`,
		);

		// Get HTML string
		const html = document.documentElement.outerHTML;
		this.logger.verbose(`Captured HTML (${html.length} characters)`);

		// 5. Extract readable text content using Mozilla Readability
		let textContent = "";
		try {
			const doc = document.cloneNode(true) as Document;
			const reader = new Readability(doc);
			const article = reader.parse();

			if (article?.textContent) {
				textContent = article.textContent.trim();
				this.logger.verbose(
					`Extracted text content using Readability (${textContent.length} characters)`,
				);
			} else {
				// Fallback to basic text extraction if Readability fails
				textContent = document.body.textContent?.trim() ?? "";
				this.logger.verbose(
					`Readability returned no content, using fallback (${textContent.length} characters)`,
				);
			}
		} catch (error) {
			// Fallback to basic text extraction on error
			textContent = document.body.textContent?.trim() ?? "";
			this.logger.warn(
				`Readability failed, using fallback extraction: ${error}`,
			);
		}

		// Store the internal context (only if readableTree exists)
		if (readableTree) {
			this.contextStore.setLatestCapturedTabContext({
				html,
				readableElementRecords,
				domTree,
				readableTree,
				textContent,
			});
			this.logger.info("Tab context loaded and stored successfully");
		} else {
			this.logger.warn(
				"Tab context loaded but not stored (no readable tree available)",
			);
		}

		// Return the public context
		return {
			html,
			readableElementRecords,
			textContent,
		};
	};
}
