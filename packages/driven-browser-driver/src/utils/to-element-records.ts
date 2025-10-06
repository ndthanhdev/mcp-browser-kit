import type { TreeNode } from "@mcp-browser-kit/utils/tree";
import { treeToPathValueArray } from "@mcp-browser-kit/utils/tree";
import type { ReadableElementRecord } from "../types";

/**
 * Converts a tree of DOM elements to an array of ReadableElementRecords
 * @param tree - TreeNode structure containing DOM elements
 * @returns Array of ReadableElementRecord objects with path, accessibleRole, and accessibleText
 */
export function toElementRecords(
	tree: TreeNode<globalThis.Element>,
): ReadableElementRecord[] {
	// Convert tree to path-value array
	const pathValueArray = treeToPathValueArray(tree);

	// Map each path-value pair to a ReadableElementRecord
	return pathValueArray.map(([path, element]): ReadableElementRecord => {
		// Extract accessible role from element
		const accessibleRole =
			element.getAttribute("role") ?? element.tagName.toLowerCase();

		// Extract accessible text from element (priority order)
		const accessibleText =
			element.getAttribute("aria-label") ??
			element.getAttribute("aria-labelledby") ??
			element.getAttribute("placeholder") ??
			element.getAttribute("title") ??
			element.textContent?.trim() ??
			"";

		return [
			path,
			accessibleRole,
			accessibleText,
		];
	});
}
