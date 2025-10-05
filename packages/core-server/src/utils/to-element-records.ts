import type { ReadableElementRecord } from "@mcp-browser-kit/core-extension";
import type { TreeNode } from "@mcp-browser-kit/utils/tree";

/**
 * Converts a tree of DOM elements to an array of ReadableElementRecords
 * @param _tree - TreeNode structure containing DOM elements
 * @returns Array of ReadableElementRecord objects with path, accessibleRole, and accessibleText
 */
export function toElementRecords(
	_tree: TreeNode<globalThis.Element>,
): ReadableElementRecord[] {
	throw new Error(
		"Not implemented: toElementRecords has been moved to @mcp-browser-kit/core-extension",
	);
}
