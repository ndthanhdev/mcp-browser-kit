import type {
	ExtensionContext,
	ExtensionToolCallInputPort,
	ExtensionToolName,
	PageChange,
	PageSaveFormat,
	PageSaveResult,
	ReadableElementRecord,
	ScrollDirection,
	TabContext,
} from "@mcp-browser-kit/core-extension";
import type {
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import type { McpToolCall } from "./assertions";
import {
	type ElementsFixtureName,
	type ExtensionContextFixture,
	elements,
	extensionContexts,
	pageText,
} from "./fixtures";

export interface FakeBrowserOptions {
	context: ExtensionContextFixture;
	elements?: ElementsFixtureName;
}

/**
 * Stands in for the extension's browser tools: records every call with named
 * arguments and answers from fixtures, enforcing the same tab, element and
 * manifest-version rules the real extension reports as errors.
 */
export class FakeExtensionTools implements ExtensionToolCallInputPort {
	readonly calls: McpToolCall[] = [];
	/** Off while the agent prepares a turn, so only the model's own tool calls are recorded. */
	recording = true;
	private readonly context: ExtensionContext;
	private readonly records: ReadableElementRecord[];
	private readonly recordsTabId?: string;
	/** Checkboxes and radios the model has clicked, keyed by readablePath. */
	private readonly checked = new Set<string>();

	constructor(options: FakeBrowserOptions) {
		this.context = extensionContexts[options.context];
		const fixture = options.elements ? elements[options.elements] : undefined;
		this.records = fixture?.records ?? [];
		this.recordsTabId = fixture?.tab.id;
	}

	getExtensionContext = (): Promise<ExtensionContext> =>
		this.call("getExtensionContext", {}, () => this.context);

	openTab = (
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}> =>
		this.call(
			"openTab",
			{
				url,
				windowId,
			},
			() => ({
				tabId: "1900",
				windowId,
			}),
		);

	closeTab = (tabId: string): Promise<void> =>
		this.call(
			"closeTab",
			{
				tabId,
			},
			() => {
				this.tab(tabId);
			},
		);

	captureTab = (tabId: string) =>
		this.call(
			"captureTab",
			{
				tabId,
			},
			() => {
				this.tab(tabId);
				return {
					width: 1280,
					height: 800,
					mimeType: "image/png",
					data: "",
				};
			},
		);

	savePage = (tabId: string, format: PageSaveFormat): Promise<PageSaveResult> =>
		this.call(
			"savePage",
			{
				tabId,
				format,
			},
			() => ({
				filename: `${this.tab(tabId).title}.${format}`,
				bytes: 48_213,
				format,
				resourceCount: 12,
				skipped: [],
			}),
		);

	loadTabContext = (tabId: string): Promise<TabContext> =>
		this.call(
			"loadTabContext",
			{
				tabId,
			},
			() => ({
				html: `<html><head><title>${this.tab(tabId).title}</title></head></html>`,
				readableElementRecords: this.recordsOf(tabId),
				textContent: pageText[tabId] ?? "",
			}),
		);

	getReadableElements = (tabId: string): Promise<ReadableElementRecord[]> =>
		this.call(
			"getReadableElements",
			{
				tabId,
			},
			() => this.recordsOf(tabId),
		);

	getReadableText = (tabId: string): Promise<string> =>
		this.call(
			"getReadableText",
			{
				tabId,
			},
			() => {
				this.tab(tabId);
				return pageText[tabId] ?? "";
			},
		);

	getElementHtml = (tabId: string, readablePath: string): Promise<string> =>
		this.call(
			"getElementHtml",
			{
				tabId,
				readablePath,
			},
			() => {
				const [, role, text] = this.element(tabId, readablePath);
				return `<div role="${role}">${text}</div>`;
			},
		);

	getSelection = (tabId: string) =>
		this.call(
			"getSelection",
			{
				tabId,
			},
			() => {
				this.tab(tabId);
				return {
					selectedText: "",
				};
			},
		);

	clickOnElement = (tabId: string, readablePath: string): Promise<PageChange> =>
		this.call(
			"clickOnElement",
			{
				tabId,
				readablePath,
			},
			() => {
				const [, role] = this.element(tabId, readablePath);
				if (role === "checkbox" || role === "radio") {
					if (role === "radio" || !this.checked.delete(readablePath)) {
						this.checked.add(readablePath);
					}
					return {
						...this.pageChange(tabId, readablePath),
						changed: true,
					};
				}
				return this.pageChange(tabId, readablePath);
			},
		);

	fillTextToElement = (
		tabId: string,
		readablePath: string,
		value: string,
	): Promise<PageChange> =>
		this.call(
			"fillTextToElement",
			{
				tabId,
				readablePath,
				value,
			},
			() => this.pageChange(tabId, readablePath),
		);

	hitEnterOnElement = (
		tabId: string,
		readablePath: string,
	): Promise<PageChange> =>
		this.call(
			"hitEnterOnElement",
			{
				tabId,
				readablePath,
			},
			() => this.pageChange(tabId, readablePath),
		);

	scrollPage = (
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange> =>
		this.call(
			"scrollPage",
			{
				tabId,
				direction,
				amount,
			},
			() => this.pageChange(tabId),
		);

	scrollElement = (
		tabId: string,
		readablePath: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<PageChange> =>
		this.call(
			"scrollElement",
			{
				tabId,
				readablePath,
				direction,
				amount,
			},
			() => this.pageChange(tabId, readablePath),
		);

	clickOnCoordinates = (tabId: string, x: number, y: number) =>
		this.call(
			"clickOnCoordinates",
			{
				tabId,
				x,
				y,
			},
			() => this.pageChange(tabId),
		);

	fillTextToCoordinates = (
		tabId: string,
		x: number,
		y: number,
		value: string,
	): Promise<PageChange> =>
		this.call(
			"fillTextToCoordinates",
			{
				tabId,
				x,
				y,
				value,
			},
			() => this.pageChange(tabId),
		);

	hitEnterOnCoordinates = (
		tabId: string,
		x: number,
		y: number,
	): Promise<PageChange> =>
		this.call(
			"hitEnterOnCoordinates",
			{
				tabId,
				x,
				y,
			},
			() => this.pageChange(tabId),
		);

	invokeJsFn = (tabId: string, fnBodyCode: string): Promise<unknown> =>
		this.call(
			"invokeJsFn",
			{
				tabId,
				fnBodyCode,
			},
			() => {
				this.tab(tabId);
				return 7;
			},
		);

	showHumanHint = (
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> =>
		this.call(
			"showHumanHint",
			{
				tabId,
				params,
				humanMessage,
			},
			() => {
				if (params?.readablePath) {
					this.element(tabId, params.readablePath);
				}
				return {
					ok: true,
				};
			},
		);

	private async call<T>(
		name: ExtensionToolName,
		input: Record<string, unknown>,
		run: () => T,
	): Promise<T> {
		if (this.recording) {
			this.calls.push({
				name,
				input,
			});
		}
		if (!this.context.availableTools.includes(name)) {
			throw new Error(
				`${name} is not supported on manifest version ${this.context.extensionInfo.manifestVersion}`,
			);
		}
		return run();
	}

	private tab(tabId: string) {
		const tab = this.context.availableTabs.find(
			(candidate) => candidate.id === tabId,
		);
		if (!tab) {
			throw new Error(`Tab not found: ${tabId}`);
		}
		return tab;
	}

	private recordsOf(tabId: string): ReadableElementRecord[] {
		this.tab(tabId);
		if (tabId !== this.recordsTabId) return [];
		return this.records.map((record) =>
			this.checked.has(record[0])
				? ([
						record[0],
						record[1],
						record[2],
						"checked",
					] as ReadableElementRecord)
				: record,
		);
	}

	private element(tabId: string, readablePath: string): ReadableElementRecord {
		const record = this.recordsOf(tabId).find(
			([path]) => path === readablePath,
		);
		if (!record) {
			throw new Error(`Element no longer exists: ${readablePath}`);
		}
		return record;
	}

	private pageChange(tabId: string, readablePath?: string): PageChange {
		const tab = this.tab(tabId);
		if (readablePath) {
			this.element(tabId, readablePath);
		}
		return {
			changed: false,
			navigated: false,
			url: tab.url,
			added: 0,
			removed: 0,
			tooLarge: false,
		};
	}
}
