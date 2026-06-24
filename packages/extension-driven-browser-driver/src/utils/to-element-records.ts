import type { TreeNode } from "@mcp-browser-kit/core-utils/tree";
import { treeToPathValueArray } from "@mcp-browser-kit/core-utils/tree";
import type { ReadableElementRecord } from "../types";

/**
 * Extracts the current form value of an element, if it has one.
 * @returns The element's value (or "checked" for checked checkboxes/radios),
 *   or "" for elements without a meaningful value.
 */
function getElementValue(element: globalThis.Element): string {
	if (element instanceof globalThis.HTMLInputElement) {
		if (element.type === "checkbox" || element.type === "radio") {
			return element.checked ? "checked" : "";
		}
		return element.value;
	}

	if (
		element instanceof globalThis.HTMLTextAreaElement ||
		element instanceof globalThis.HTMLSelectElement
	) {
		return element.value;
	}

	return "";
}

/**
 * Converts a tree of DOM elements to an array of ReadableElementRecords
 * @param tree - TreeNode structure containing DOM elements
 * @returns Array of ReadableElementRecord tuples with path, accessibleRole,
 *   accessibleText, and an optional value (appended only when the element has
 *   a non-empty form value)
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

		const record: ReadableElementRecord = [
			path,
			accessibleRole,
			accessibleText,
		];

		// Append the current form value only when present, keeping the tuple at
		// 3 elements for everything without a value.
		const value = getElementValue(element);
		if (value) {
			record.push(value);
		}

		return record;
	});
}
