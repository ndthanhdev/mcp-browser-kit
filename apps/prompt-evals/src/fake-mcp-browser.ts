import type { McpToolCall } from "./assertions";
import {
	type ElementsFixtureName,
	elements,
	extensionContexts,
	type McpContextFixture,
	mcpContexts,
	pageText,
} from "./fixtures";

export interface FakeMcpBrowserOptions {
	/** Defaults to `mv3` so tests that make the model discover tabs still have some. */
	context?: McpContextFixture;
	elements?: ElementsFixtureName;
}

type Input = Record<string, unknown>;

const PAGE_SIZE = 1000;

/** Page-change text for actions: a visible change, so the model does not read success as a no-op and retry. */
const ACTION_DONE = [
	"Done. Page changed (1 added, 0 removed).",
	"```diff",
	'+ ["f1:e90", "status", "Action completed"]',
	"```",
].join("\n");

const ok = (value: unknown): string =>
	JSON.stringify({
		ok: true,
		value,
	});

const fail = (reason: string): string =>
	JSON.stringify({
		ok: false,
		reason,
	});

class ToolError extends Error {}

/**
 * Stands in for the MCP server with a connected browser: records every tool
 * call and answers from fixtures. Reading tools return the same data the
 * prompt shows; action tools succeed with an unchanged page, so the model can
 * keep going after reading and its later calls are graded too.
 */
export class FakeMcpBrowser {
	readonly calls: McpToolCall[] = [];
	private readonly contextName: McpContextFixture;
	private readonly elementsName?: ElementsFixtureName;
	private readonly snapshots = new Map<string, string>();

	constructor(options: FakeMcpBrowserOptions) {
		this.contextName = options.context ?? "mv3";
		this.elementsName = options.elements;
	}

	call = (name: string, input: Input, required: string[] = []): string => {
		this.calls.push({
			name,
			input,
		});
		const missing = required.filter((key) => input[key] === undefined);
		if (missing.length > 0) {
			// The real server rejects these in schema validation, before any browser call.
			return `MCP error -32602: Input validation error: missing required ${missing.join(", ")}`;
		}
		try {
			return this.run(name, input);
		} catch (error) {
			if (error instanceof ToolError) return fail(error.message);
			throw error;
		}
	};

	private run(name: string, input: Input): string {
		if (name === "getContext") {
			return JSON.stringify(mcpContexts[this.contextName], null, 2);
		}
		this.checkSupported(name);
		switch (name) {
			case "getReadableText":
				return ok(this.snapshot("readable-text", this.text(input)));
			case "getReadableElements":
				return ok({
					snapshotId: `s-${this.elementsName ?? "empty"}-${this.tabId(input)}`,
					data: this.records(input),
					hasNextPage: false,
					totalPages: 1,
				});
			case "getReadableElementHtml": {
				const [, role, text] = this.element(input);
				return ok(`<div role="${role}">${text}</div>`);
			}
			case "getSnapshotPage":
				return ok(this.snapshotPage(input));
			case "getSelection":
				this.tab(input);
				return ok({
					selectedText: "",
				});
			case "captureTab":
				this.tab(input);
				return ok({
					width: 1280,
					height: 800,
					mimeType: "image/png",
					data: "",
				});
			case "savePage": {
				const format = (input.format as string | undefined) ?? "zip";
				return ok({
					filename: `${this.tab(input).title}.${format}`,
					bytes: 48_213,
					format,
					resourceCount: 12,
					skipped: [],
				});
			}
			case "openTab":
				return ok({
					browserId: input.browserId,
					windowId: input.windowId,
					tabId: "1900",
				});
			case "closeTab":
				this.tab(input);
				return ok({});
			case "invokeJsFn":
				this.tab(input);
				return ok(7);
			case "showHumanHint":
				if (input.readablePath) this.element(input);
				else this.tab(input);
				return JSON.stringify({
					humanMessage: `Please ${input.action} in the highlighted area: ${input.message}`,
					expiresInSeconds: 120,
				});
			default:
				if (input.readablePath) this.element(input);
				else this.tab(input);
				return ACTION_DONE;
		}
	}

	private checkSupported(name: string): void {
		const browser = mcpContexts[this.contextName].browsers[0];
		if (browser && "versionMismatch" in browser && browser.versionMismatch) {
			throw new ToolError(browser.versionMismatch.message);
		}
		const manifestVersion = browser?.extensionInfo.manifestVersion;
		const tools =
			manifestVersion === 2
				? extensionContexts.mv2.availableTools
				: extensionContexts.mv3.availableTools;
		const extensionName =
			name === "getReadableElementHtml" ? "getElementHtml" : name;
		const known = extensionContexts.mv2.availableTools as string[];
		if (
			known.includes(extensionName) &&
			!(tools as string[]).includes(extensionName)
		) {
			throw new ToolError(
				`${name} is not supported on manifest version ${manifestVersion}`,
			);
		}
	}

	private tabId(input: Input): string {
		return String(input.tabId ?? "");
	}

	private tab(input: Input) {
		const tabId = this.tabId(input);
		const tab = mcpContexts[this.contextName].browsers
			.flatMap((browser) => browser.tabs)
			.find((candidate) => candidate.id === tabId);
		if (!tab) throw new ToolError(`Tab not found: ${tabId}`);
		return tab;
	}

	private records(input: Input) {
		const tab = this.tab(input);
		// The test's elements fixture wins for its tab; other tabs show their
		// natural fixture, so a model that reads a tab itself finds its elements.
		const chosen = this.elementsName ? elements[this.elementsName] : undefined;
		const fixture =
			chosen?.tab.id === tab.id
				? chosen
				: Object.values(elements).find(
						(candidate) => candidate.tab.id === tab.id,
					);
		return fixture?.records ?? [];
	}

	private element(input: Input) {
		const readablePath = String(input.readablePath ?? "");
		const record = this.records(input).find(([path]) => path === readablePath);
		if (!record) {
			throw new ToolError(`Element no longer exists: ${readablePath}`);
		}
		return record;
	}

	private text(input: Input): string {
		const tab = this.tab(input);
		return (pageText as Record<string, string>)[tab.id] ?? tab.title;
	}

	private snapshot(type: string, text: string) {
		const snapshotId = `snap-${this.snapshots.size + 1}`;
		this.snapshots.set(snapshotId, text);
		return this.page(snapshotId, type, text, 1);
	}

	private snapshotPage(input: Input) {
		const snapshotId = String(input.snapshotId ?? "");
		const pageNumber = Number(input.pageNumber ?? 1);
		// Snapshots the prompt mentions but this fake never produced still page,
		// with filler text, so pagination prompts can be followed.
		const text =
			this.snapshots.get(snapshotId) ??
			Object.values(pageText).join(" ").repeat(8);
		return this.page(
			snapshotId,
			String(input.type ?? "readable-text"),
			text,
			pageNumber,
		);
	}

	private page(
		snapshotId: string,
		type: string,
		text: string,
		pageNumber: number,
	) {
		const totalPages = Math.max(1, Math.ceil(text.length / PAGE_SIZE));
		if (pageNumber < 1 || pageNumber > totalPages) {
			throw new ToolError(
				`Page ${pageNumber} out of range for snapshot ${snapshotId} (${totalPages} pages)`,
			);
		}
		const hasNextPage = pageNumber < totalPages;
		return {
			snapshotId,
			type,
			data: text.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE),
			hasNextPage,
			nextPageNumber: hasNextPage ? pageNumber + 1 : undefined,
			totalPages,
		};
	}
}
