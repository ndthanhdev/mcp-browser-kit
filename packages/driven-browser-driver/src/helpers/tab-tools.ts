import type {
	InternalTabContext,
	TabContext,
} from "@mcp-browser-kit/core-extension";
import { injectable } from "inversify";
import * as animation from "../utils/animation-tools";
import * as dom from "../utils/dom-tools";
import { toDomTree } from "../utils/to-dom-tree";
import { toElementRecords } from "../utils/to-element-records";
import { domTreeToReadableTree } from "../utils/to-readable-tree";

/**
 * TabTools class provides access to browser automation tools.
 */
@injectable()
export class TabTools {
	public readonly animation = animation;
	public readonly dom = dom;

	private latestCapturedTabContext: InternalTabContext | undefined;

	async loadTabContext(_tabId: string): Promise<TabContext> {
		// 1. Get root element from document
		const rootElement = document.body || document.documentElement;

		// 2. Convert root element to DOM tree
		const domTree = toDomTree(rootElement);

		// 3. Convert DOM tree to readable tree
		const readableTree = domTreeToReadableTree(domTree);

		// 4. Convert readable tree to element records
		const readableElementRecords = readableTree
			? toElementRecords(readableTree)
			: [];

		// Get HTML string
		const html = document.documentElement.outerHTML;

		// Store the internal context (only if readableTree exists)
		if (readableTree) {
			this.latestCapturedTabContext = {
				html,
				readableElementRecords,
				domTree,
				readableTree,
			};
		}

		// Return the public context
		return {
			html,
			readableElementRecords,
		};
	}
}
