import type { TreeNode } from "@mcp-browser-kit/core-utils/tree";
import type { JSDOM } from "jsdom";

/**
 * Converts JSDOM to a complete DOM tree structure
 * @param _dom - JSDOM instance to convert
 * @returns TreeNode structure with all Element nodes
 */
export function jsdomToDomTree(_dom: JSDOM): TreeNode<globalThis.Element> {
	throw new Error(
		"Not implemented: jsdomToDomTree has been moved to @mcp-browser-kit/core-extension",
	);
}
