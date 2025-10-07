import type { TreeNode } from "@mcp-browser-kit/core-utils/tree";
import type { JSDOM } from "jsdom";

/**
 * Filters a DOM tree to only include readable/interactive elements
 * @param _tree - TreeNode structure to filter
 * @returns Filtered TreeNode structure or null if node is not readable
 */
export function domTreeToReadableTree(
	_tree: TreeNode<globalThis.Element>,
): TreeNode<globalThis.Element> | null {
	throw new Error(
		"Not implemented: domTreeToReadableTree has been moved to @mcp-browser-kit/core-extension",
	);
}

/**
 * Converts JSDOM to a tree of readable elements
 * @param _dom - JSDOM instance to parse
 * @returns TreeNode structure with readable Element data
 */
export function toReadableTree(_dom: JSDOM): TreeNode<globalThis.Element> {
	throw new Error(
		"Not implemented: toReadableTree has been moved to @mcp-browser-kit/core-extension",
	);
}
