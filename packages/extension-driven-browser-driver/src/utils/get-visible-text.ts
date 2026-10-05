const NON_VISIBLE_TAG_NAMES = new Set([
	"STYLE",
	"SCRIPT",
	"NOSCRIPT",
	"TEMPLATE",
]);

const collectText = (node: globalThis.Node, parts: string[]): void => {
	if (node.nodeType === globalThis.Node.TEXT_NODE) {
		parts.push(node.nodeValue ?? "");
		return;
	}
	if (
		node.nodeType === globalThis.Node.ELEMENT_NODE &&
		NON_VISIBLE_TAG_NAMES.has(
			(node as globalThis.Element).tagName.toUpperCase(),
		)
	) {
		return;
	}
	for (const child of node.childNodes) {
		collectText(child, parts);
	}
};

/**
 * Like `textContent`, but skips the contents of non-user-facing elements
 * (`<style>`, `<script>`, `<noscript>`, `<template>`). The result is trimmed;
 * inner whitespace is preserved.
 */
export function getVisibleText(node: globalThis.Node): string {
	const parts: string[] = [];
	collectText(node, parts);
	return parts.join("").trim();
}
