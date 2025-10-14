import type { TreeNode } from "@mcp-browser-kit/core-utils";
import type { ReadableElementRecord } from "./readable-element-record";

export interface TabContext {
	html: string;
	readableElementRecords: ReadableElementRecord[];
	textContent: string;
}

export interface InternalTabContext {
	html: string;
	readableElementRecords: ReadableElementRecord[];
	textContent: string;
	domTree: TreeNode<globalThis.Element>;
	readableTree: TreeNode<globalThis.Element>;
}
