import type { TreeNode } from "@mcp-browser-kit/utils/tree";

/**
 * Builds a tree structure from a DOM element
 */
export function toDomTree(
	element: globalThis.Element,
): TreeNode<globalThis.Element> {
	const children: TreeNode<globalThis.Element>[] = [];

	// Recursively process child elements
	for (let i = 0; i < element.children.length; i++) {
		const child = element.children[i];
		if (child) {
			children.push(toDomTree(child));
		}
	}

	return {
		data: element,
		children: children.length > 0 ? children : undefined,
	};
}
