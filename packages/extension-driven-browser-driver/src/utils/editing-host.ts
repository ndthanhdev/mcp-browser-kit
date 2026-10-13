/**
 * True for the root of a contenteditable region (the element a rich-text
 * editor such as Quill, ProseMirror or Lexical owns), false for its
 * descendants.
 */
export const isEditingHost = (element: globalThis.Element): boolean =>
	element instanceof globalThis.HTMLElement &&
	element.isContentEditable &&
	!element.parentElement?.isContentEditable;

/** The outermost contenteditable ancestor of `element` (or itself). */
export const editingHostOf = (
	element: globalThis.HTMLElement,
): globalThis.HTMLElement => {
	let host = element;
	while (host.parentElement?.isContentEditable) {
		host = host.parentElement;
	}
	return host;
};

/**
 * The editor's rendered text with whitespace normalized: non-breaking spaces
 * become spaces and runs of line breaks collapse to one, since block elements
 * (`<p>`, `<div>`) add a varying number of breaks to `innerText`.
 */
export const normalizeEditorText = (text: string): string =>
	text
		.replace(/\u00a0/g, " ")
		.replace(/\r\n?/g, "\n")
		.replace(/\n+/g, "\n")
		.trim();

export const getEditingHostText = (host: globalThis.HTMLElement): string =>
	normalizeEditorText(host.innerText);
