/**
 * Checks if a DOM element is considered readable/interactive
 * @param element - A jsdom Element to check
 * @returns true if the element has aria-label or is a readable/interactive element type
 */
export function isReadable(element: globalThis.Element): boolean {
	// Check if element has aria-label attribute
	if (element.hasAttribute("aria-label")) {
		return true;
	}

	// List of always readable/interactive element types
	const alwaysReadableTagNames = new Set([
		"A", // Links
		"BUTTON", // Buttons
		"INPUT", // Form inputs
		"TEXTAREA", // Text areas
		"SELECT", // Dropdowns
		"P", // Paragraphs
		"H1",
		"H2",
		"H3",
		"H4",
		"H5",
		"H6", // Headings
		"LABEL", // Form labels
		"SPAN", // Inline text
		"LI", // List items
		"TD",
		"TH", // Table cells
		"SUMMARY", // Details summary
		"OPTION", // Select options
	]);

	// Check if element is in always readable list
	if (alwaysReadableTagNames.has(element.tagName)) {
		return true;
	}

	// If not in always readable list, check if it's a leaf node with inner text
	const isLeafNode = element.children.length === 0;
	const hasInnerText = (element.textContent?.trim() ?? "") !== "";

	return isLeafNode && hasInnerText;
}
