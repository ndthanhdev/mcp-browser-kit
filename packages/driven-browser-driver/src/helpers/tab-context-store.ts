import type { InternalTabContext } from "@mcp-browser-kit/core-extension";
import { findNodeByPath } from "@mcp-browser-kit/utils/tree";
import { injectable } from "inversify";

@injectable()
export class TabContextStore {
	private latestCapturedTabContext: InternalTabContext | undefined;

	setLatestCapturedTabContext(context: InternalTabContext) {
		this.latestCapturedTabContext = context;
	}

	getLatestCapturedTabContext(): InternalTabContext | undefined {
		return this.latestCapturedTabContext;
	}

	clearLatestCapturedTabContext() {
		this.latestCapturedTabContext = undefined;
	}

	getElementFromPath(readablePath: string): HTMLElement | null {
		// Get readableTree from contextStore
		const tabContext = this.getLatestCapturedTabContext();
		if (!tabContext?.readableTree) {
			throw new Error("No readable tree available in context store");
		}

		// Find element by path
		const node = findNodeByPath(tabContext.readableTree, readablePath);
		if (!node) {
			throw new Error(`Element not found at path: ${readablePath}`);
		}

		const element = node.data as HTMLElement;

		// Check if element still exists in document
		if (!document.contains(element)) {
			throw new Error(
				`Element at path ${readablePath} no longer exists in document`,
			);
		}

		return element;
	}
}
