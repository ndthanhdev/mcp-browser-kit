import type { TabContext } from "@mcp-browser-kit/core-extension";
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

	constructor(
		@inject(TabDomTools) dom: TabDomTools,
		@inject(TabAnimationTools) animation: TabAnimationTools,
		@inject(TabContextStore) contextStore: TabContextStore,
	) {
		this.dom = dom;
		this.animation = animation;
		this.contextStore = contextStore;
	}

	loadTabContext = async (): Promise<TabContext> => {
		// 1. Get root element from document
		const rootElement = document.documentElement;

		// 2. Convert root element to DOM tree
		const domTree = toDomTree(rootElement);

		// 3. Convert DOM tree to readable tree
		const readableTree = domTreeToReadableTree(domTree);

		// 4. Convert readable tree to element records
		const readableElementRecords = readableTree
			? toElementRecords(readableTree).slice(1)
			: [];

		// Get HTML string
		const html = document.documentElement.outerHTML;

		// Store the internal context (only if readableTree exists)
		if (readableTree) {
			this.contextStore.setLatestCapturedTabContext({
				html,
				readableElementRecords,
				domTree,
				readableTree,
			});
		}

		// Return the public context
		return {
			html,
			readableElementRecords,
		};
	};
}
