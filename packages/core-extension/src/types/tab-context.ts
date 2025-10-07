import type { TreeNode } from "@mcp-browser-kit/core-utils";
import type { ReadableElementRecord } from "./readable-element-record";

export interface TabContext {
	html: string;
	readableElementRecords: ReadableElementRecord[];
}

export interface InternalTabContext extends TabContext {
	domTree: TreeNode<globalThis.Element>;
	readableTree: TreeNode<globalThis.Element>;
}
