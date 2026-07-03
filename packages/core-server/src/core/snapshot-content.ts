import type {
	ExtensionToolCallInputPort,
	ReadableElementRecord,
} from "@mcp-browser-kit/core-extension";
import { createPrefixId } from "@mcp-browser-kit/core-utils";
import { inject, injectable } from "inversify";
import type { SnapshotContentInputPort } from "../input-ports/snapshot-content";
import { LoggerFactoryOutputPort } from "../output-ports";
import type { SnapshotResult } from "../types";
import { ExtensionChannelManager } from "./extension-channel-manager";

const PAGE_SIZE_CHARS = 8_192;
const SNAPSHOT_CAP = 50;

const snapshotIdGenerator = createPrefixId("snapshot");

type ContentType =
	| "readable-text"
	| "readable-elements"
	| "readable-element-html";

const elementHtmlCacheKey = (
	channelId: string,
	tabId: string,
	readablePath: string,
): string => `${channelId}::${tabId}::readable-element-html::${readablePath}`;

interface CachedPages<T> {
	snapshotId: string;
	channelId: string;
	tabId: string;
	type: ContentType;
	pages: T[];
	totalPages: number;
}

const cacheKey = (
	channelId: string,
	tabId: string,
	type: ContentType,
): string => `${channelId}::${tabId}::${type}`;

function splitText(text: string, pageSize: number): string[] {
	if (text.length === 0)
		return [
			text,
		];
	const pages: string[] = [];
	for (let i = 0; i < text.length; i += pageSize) {
		pages.push(text.slice(i, i + pageSize));
	}
	return pages;
}

function splitArrayByCharLength<T>(items: T[], maxChars: number): T[][] {
	if (items.length === 0)
		return [
			items,
		];
	const pages: T[][] = [];
	let currentPage: T[] = [];
	let currentLength = 0;

	for (const item of items) {
		const itemLength = JSON.stringify(item).length;
		if (currentPage.length === 0) {
			currentPage.push(item);
			currentLength = itemLength;
		} else if (currentLength + itemLength <= maxChars) {
			currentPage.push(item);
			currentLength += itemLength;
		} else {
			pages.push(currentPage);
			currentPage = [
				item,
			];
			currentLength = itemLength;
		}
	}
	if (currentPage.length > 0) {
		pages.push(currentPage);
	}
	return pages;
}

function buildResult<T>(
	cached: CachedPages<T>,
	pageNumber: number,
): SnapshotResult<T> {
	return {
		snapshotId: cached.snapshotId,
		pageNumber,
		nextPageNumber: pageNumber < cached.totalPages ? pageNumber + 1 : null,
		hasNextPage: pageNumber < cached.totalPages,
		totalPages: cached.totalPages,
		data: cached.pages[pageNumber - 1],
	};
}

@injectable()
export class SnapshotContentUseCases implements SnapshotContentInputPort {
	private readonly logger;
	private readonly cache = new Map<string, CachedPages<unknown>>();
	private readonly cacheBySnapshotId = new Map<string, CachedPages<unknown>>();

	constructor(
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
		@inject(ExtensionChannelManager)
		private readonly extensionChannelManager: ExtensionChannelManager,
	) {
		this.logger = loggerFactory.create("SnapshotContent");
	}

	async getReadableTextPage(
		channelId: string,
		tabId: string,
		pageNumber = 1,
	): Promise<SnapshotResult<string>> {
		const key = cacheKey(channelId, tabId, "readable-text");

		if (pageNumber === 1) {
			const text = await this.fetchReadableText(channelId, tabId);
			const pages = splitText(text, PAGE_SIZE_CHARS);
			const snapshotId = snapshotIdGenerator.generate();
			const cached: CachedPages<string> = {
				snapshotId,
				channelId,
				tabId,
				type: "readable-text",
				pages,
				totalPages: pages.length,
			};
			this.cache.set(key, cached);
			this.cacheBySnapshotId.set(snapshotId, cached);
			this.evictIfOverCap();
			this.logger.verbose("Cached readable-text", {
				channelId,
				tabId,
				totalPages: cached.totalPages,
				snapshotId: cached.snapshotId,
			});
			return buildResult(cached, 1);
		}

		return this.getFromCache<string>(key, pageNumber, "readable-text");
	}

	async getReadableElementsPage(
		channelId: string,
		tabId: string,
		pageNumber = 1,
	): Promise<SnapshotResult<ReadableElementRecord[]>> {
		const key = cacheKey(channelId, tabId, "readable-elements");

		if (pageNumber === 1) {
			const elements = await this.fetchReadableElements(channelId, tabId);
			const pages = splitArrayByCharLength(elements, PAGE_SIZE_CHARS);
			const snapshotId = snapshotIdGenerator.generate();
			const cached: CachedPages<ReadableElementRecord[]> = {
				snapshotId,
				channelId,
				tabId,
				type: "readable-elements",
				pages,
				totalPages: pages.length,
			};
			this.cache.set(key, cached);
			this.cacheBySnapshotId.set(snapshotId, cached);
			this.evictIfOverCap();
			this.logger.verbose("Cached readable-elements", {
				channelId,
				tabId,
				totalPages: cached.totalPages,
				snapshotId: cached.snapshotId,
			});
			return buildResult(cached, 1);
		}

		return this.getFromCache<ReadableElementRecord[]>(
			key,
			pageNumber,
			"readable-elements",
		);
	}

	async getReadableElementHtmlPage(
		channelId: string,
		tabId: string,
		readablePath: string,
		pageNumber = 1,
	): Promise<SnapshotResult<string>> {
		const key = elementHtmlCacheKey(channelId, tabId, readablePath);

		if (pageNumber === 1) {
			const html = await this.fetchElementHtml(channelId, tabId, readablePath);
			const pages = splitText(html, PAGE_SIZE_CHARS);
			const snapshotId = snapshotIdGenerator.generate();
			const cached: CachedPages<string> = {
				snapshotId,
				channelId,
				tabId,
				type: "readable-element-html",
				pages,
				totalPages: pages.length,
			};
			this.cache.set(key, cached);
			this.cacheBySnapshotId.set(snapshotId, cached);
			this.evictIfOverCap();
			this.logger.verbose("Cached readable-element-html", {
				channelId,
				tabId,
				readablePath,
				totalPages: cached.totalPages,
				snapshotId: cached.snapshotId,
			});
			return buildResult(cached, 1);
		}

		return this.getFromCache<string>(key, pageNumber, "readable-element-html");
	}

	async getSnapshotPage(
		snapshotId: string,
		type: ContentType,
		pageNumber: number,
	): Promise<SnapshotResult<any>> {
		const cached = this.cacheBySnapshotId.get(snapshotId);
		if (!cached) {
			throw new Error(
				`No cached snapshot pages found for snapshot ID: ${snapshotId}. Read page 1 first to fetch and cache content.`,
			);
		}
		if (cached.type !== type) {
			throw new Error(
				`Requested snapshot type (${type}) does not match cached type (${cached.type}) for snapshot ID: ${snapshotId}.`,
			);
		}
		if (pageNumber < 1 || pageNumber > cached.totalPages) {
			throw new Error(
				`Page ${pageNumber} out of range (1–${cached.totalPages}) for snapshot ID: ${snapshotId}`,
			);
		}
		return buildResult(cached, pageNumber);
	}

	invalidateCache(channelId: string, tabId?: string): void {
		if (tabId) {
			this.cache.delete(cacheKey(channelId, tabId, "readable-text"));
			this.cache.delete(cacheKey(channelId, tabId, "readable-elements"));
			// Element-html entries are keyed per readablePath, so purge by prefix.
			const elementHtmlPrefix = `${channelId}::${tabId}::readable-element-html::`;
			for (const [key, cached] of this.cache.entries()) {
				if (key.startsWith(elementHtmlPrefix)) {
					this.cacheBySnapshotId.delete(cached.snapshotId);
					this.cache.delete(key);
				}
			}
			this.logger.verbose("Invalidated latest-snapshot pointer for tab", {
				channelId,
				tabId,
			});
			return;
		}

		const prefix = `${channelId}::`;
		for (const [key, cached] of this.cache.entries()) {
			if (key.startsWith(prefix)) {
				this.cacheBySnapshotId.delete(cached.snapshotId);
				this.cache.delete(key);
			}
		}
		for (const [id, cached] of this.cacheBySnapshotId.entries()) {
			if (cached.channelId === channelId) {
				this.cacheBySnapshotId.delete(id);
			}
		}
		this.logger.verbose("Purged all snapshots for disconnected channel", {
			channelId,
		});
	}

	private evictIfOverCap(): void {
		while (this.cacheBySnapshotId.size > SNAPSHOT_CAP) {
			const oldest = this.cacheBySnapshotId.keys().next().value;
			if (oldest === undefined) break;
			this.cacheBySnapshotId.delete(oldest);
		}
	}

	private getFromCache<T>(
		key: string,
		pageNumber: number,
		type: ContentType,
	): SnapshotResult<T> {
		const cached = this.cache.get(key) as CachedPages<T> | undefined;
		if (!cached) {
			throw new Error(
				`No cached ${type} pages. Read page 1 first to fetch and cache content.`,
			);
		}
		if (pageNumber < 1 || pageNumber > cached.totalPages) {
			throw new Error(
				`Page ${pageNumber} out of range (1–${cached.totalPages}) for ${type}`,
			);
		}
		return buildResult(cached, pageNumber);
	}

	private async fetchReadableText(
		channelId: string,
		tabId: string,
	): Promise<string> {
		const rpcClient = this.getRpcClient(channelId);
		return rpcClient.call({
			method: "getReadableText" as keyof ExtensionToolCallInputPort,
			args: [
				tabId,
			] as never,
			extraArgs: {},
		}) as Promise<string>;
	}

	private async fetchReadableElements(
		channelId: string,
		tabId: string,
	): Promise<ReadableElementRecord[]> {
		const rpcClient = this.getRpcClient(channelId);
		return rpcClient.call({
			method: "getReadableElements" as keyof ExtensionToolCallInputPort,
			args: [
				tabId,
			] as never,
			extraArgs: {},
		}) as Promise<ReadableElementRecord[]>;
	}

	private async fetchElementHtml(
		channelId: string,
		tabId: string,
		readablePath: string,
	): Promise<string> {
		const rpcClient = this.getRpcClient(channelId);
		return rpcClient.call({
			method: "getElementHtml" as keyof ExtensionToolCallInputPort,
			args: [
				tabId,
				readablePath,
			] as never,
			extraArgs: {},
		}) as Promise<string>;
	}

	private getRpcClient(channelId: string) {
		const rpcClient =
			this.extensionChannelManager.getRpcClientByChannelId(channelId);
		if (!rpcClient) {
			throw new Error(`No active channel for: ${channelId}`);
		}
		return rpcClient;
	}
}
