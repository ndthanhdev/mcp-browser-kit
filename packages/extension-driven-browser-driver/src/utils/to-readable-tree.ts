import type { TreeNode } from "@mcp-browser-kit/core-utils/tree";
import { conditionalPrune } from "@mcp-browser-kit/core-utils/tree";
import { isReadable } from "./is-readable";

/**
 * Filters a DOM tree to only include readable/interactive elements
 * @param tree - TreeNode structure to filter
 * @returns Filtered TreeNode structure or null if node is not readable
 */
export function domTreeToReadableTree(
	tree: TreeNode<globalThis.Element>,
): TreeNode<globalThis.Element> | null {
	return conditionalPrune(tree, {
		shouldInclude: isReadable,
	});
}
