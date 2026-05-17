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
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabDomTools) public readonly dom: TabDomTools,
		@inject(TabAnimationTools) public readonly animation: TabAnimationTools,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabTools");
	}

	loadTabContext = async (): Promise<TabContext> => {
		this.logger.info("Loading tab context");

		const rootElement = document.documentElement;
		const domTree = toDomTree(rootElement);
		const readableTree = domTreeToReadableTree(domTree);
		this.logger.verbose(
			`Converted DOM tree to readable tree: ${readableTree ? "success" : "failed"}`,
		);

		const readableElementRecords = readableTree
			? toElementRecords(readableTree).slice(1)
			: [];

		const html = document.documentElement.outerHTML;
		const textContent = this.extractTextContent();

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

		await this.animation.playScanAnimation();

		return {
			html,
			readableElementRecords,
			textContent,
		};
	};

	private extractTextContent = (): string => {
		try {
			const doc = document.cloneNode(true) as Document;
			const article = new Readability(doc).parse();
			if (article?.textContent) {
				return article.textContent.trim();
			}
			return document.body.textContent?.trim() ?? "";
		} catch (error) {
			this.logger.warn(
				`Readability failed, using fallback extraction: ${error}`,
			);
			return document.body.textContent?.trim() ?? "";
		}
	};
}
