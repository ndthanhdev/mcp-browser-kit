import type {
	LoadTabContextOptions,
	TabContext,
} from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type {
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import { Readability } from "@mozilla/readability";
import { inject, injectable } from "inversify";
import { toDomTree } from "../utils/to-dom-tree";
import { toElementRecords } from "../utils/to-element-records";
import { domTreeToReadableTree } from "../utils/to-readable-tree";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";
import { TabDomTools } from "./tab-dom-tools";
import { TabHumanHintTools } from "./tab-human-hint-tools";
import { TabPageSaveTools } from "./tab-page-save-tools";

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
		@inject(TabPageSaveTools) public readonly pageSave: TabPageSaveTools,
		@inject(TabHumanHintTools) private readonly humanHint: TabHumanHintTools,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
	) {
		this.logger = this.loggerFactory.create("TabTools");
	}

	/**
	 * Snapshots the page. With `commit: false` the snapshot is returned but not
	 * stored, so readablePaths keep resolving against the previous snapshot.
	 */
	loadTabContext = async (
		options?: LoadTabContextOptions | null,
	): Promise<TabContext> => {
		// Messaging serializes an omitted argument as null, which a default
		// parameter would not replace.
		const { commit = true, animate = true } = options ?? {};
		this.logger.info("Loading tab context", {
			commit,
			animate,
		});

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

		if (readableTree && commit) {
			this.contextStore.setLatestCapturedTabContext({
				html,
				readableElementRecords,
				domTree,
				readableTree,
				textContent,
			});
			this.logger.info("Tab context loaded and stored successfully");
		} else if (!readableTree) {
			this.logger.warn(
				"Tab context loaded but not stored (no readable tree available)",
			);
		}

		if (animate) {
			await this.animation.playScanAnimation();
		}

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

	showHumanHint = async (
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> => {
		return this.humanHint.showHumanHint(params, humanMessage);
	};
}
