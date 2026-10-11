import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { inject, injectable } from "inversify";
import browser from "webextension-polyfill";

export interface FrameInstance {
	browserFrameId: string;
	documentId: string;
}

interface TabFrameIds {
	nextId: number;
	frames: Record<string, FrameInstance>;
}

const storageKey = (tabId: string) => `frameIds:${tabId}`;

/**
 * Assigns each frame instance — one browser frame running one document — a
 * stable id (`f` + base-36 counter, per tab). A reload, navigation or
 * recreated iframe is a new document, so it gets a new id and paths into the
 * old document fail instead of silently hitting a different element.
 *
 * State lives in `storage.session` so ids are never reused when the MV3
 * service worker is suspended and restarted.
 */
@injectable()
export class FrameIdRegistry {
	private readonly logger;
	private readonly cache = new Map<string, TabFrameIds>();
	// Serializes read-modify-write cycles so concurrent calls can't mint
	// duplicate ids.
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		@inject(LoggerFactoryOutputPort)
		private readonly loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = this.loggerFactory.create("FrameIdRegistry");
	}

	/**
	 * Returns the id of each given frame instance, minting ids for new ones.
	 * Forgets instances whose browser frame is gone or now hosts a different
	 * document.
	 */
	assign = (
		tabId: string,
		liveBrowserFrameIds: string[],
		instances: FrameInstance[],
	): Promise<string[]> =>
		this.withTab(tabId, (state) => {
			const live = new Set(liveBrowserFrameIds);
			const current = new Map(
				instances.map((instance) => [
					instance.browserFrameId,
					instance.documentId,
				]),
			);
			for (const [frameId, instance] of Object.entries(state.frames)) {
				const currentDocumentId = current.get(instance.browserFrameId);
				if (
					!live.has(instance.browserFrameId) ||
					(currentDocumentId !== undefined &&
						currentDocumentId !== instance.documentId)
				) {
					delete state.frames[frameId];
				}
			}
			return instances.map((instance) => this.idIn(state, instance));
		});

	/** Returns the id of one frame instance, minting it if new. */
	idOf = (tabId: string, instance: FrameInstance): Promise<string> =>
		this.withTab(tabId, (state) => this.idIn(state, instance));

	/**
	 * Resolves a frame id to its frame instance.
	 * @throws if the id is unknown or its document was replaced.
	 */
	resolve = (tabId: string, frameId: string): Promise<FrameInstance> =>
		this.withTab(tabId, (state) => {
			const instance = state.frames[frameId];
			if (!instance) {
				throw new Error(
					`Frame ${frameId} no longer exists — re-read readable-elements`,
				);
			}
			return instance;
		});

	private idIn(state: TabFrameIds, instance: FrameInstance): string {
		const existing = Object.entries(state.frames).find(
			([, known]) =>
				known.browserFrameId === instance.browserFrameId &&
				known.documentId === instance.documentId,
		);
		if (existing) {
			return existing[0];
		}
		const frameId = `f${(state.nextId++).toString(36)}`;
		state.frames[frameId] = instance;
		return frameId;
	}

	private withTab = <T>(
		tabId: string,
		fn: (state: TabFrameIds) => T,
	): Promise<T> => {
		const run = async () => {
			const state = await this.load(tabId);
			const before = JSON.stringify(state);
			const result = fn(state);
			if (JSON.stringify(state) !== before) {
				await this.save(tabId, state);
			}
			return result;
		};
		const result = this.queue.then(run, run);
		this.queue = result.catch(() => undefined);
		return result;
	};

	private load = async (tabId: string): Promise<TabFrameIds> => {
		const cached = this.cache.get(tabId);
		if (cached) {
			return cached;
		}
		let state: TabFrameIds = {
			nextId: 1,
			frames: {},
		};
		try {
			const key = storageKey(tabId);
			const stored = (await browser.storage?.session?.get(key))?.[key] as
				| TabFrameIds
				| undefined;
			if (stored) {
				state = stored;
			}
		} catch (error) {
			this.logger.warn("Failed to load frame ids from session storage:", error);
		}
		this.cache.set(tabId, state);
		return state;
	};

	private save = async (tabId: string, state: TabFrameIds): Promise<void> => {
		try {
			await browser.storage?.session?.set({
				[storageKey(tabId)]: state,
			});
		} catch (error) {
			this.logger.warn("Failed to save frame ids to session storage:", error);
		}
	};
}
