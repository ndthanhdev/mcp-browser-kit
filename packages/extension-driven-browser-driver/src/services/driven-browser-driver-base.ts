import type {
	BrowserDriverOutputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension/output-ports";
import type {
	BrowserInfo,
	ExtensionInfo,
	ExtensionTabInfo,
	ExtensionWindowInfo,
	Screenshot,
	ScrollDirection,
	Selection,
	TabContext,
} from "@mcp-browser-kit/core-extension/types";
import type {
	Func,
	HumanHintTabResult,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";
import * as backgroundToolsM3 from "../utils/background-tools-m3";
import { buildFramePath, parseFramePath } from "../utils/frame-path";
import { mergeFrameTabContexts } from "../utils/merge-frame-tab-contexts";
import type { FrameCorrelationService } from "./frame-correlation-service";
import type { FrameRegistryService } from "./frame-registry-service";
import type { HitTargetResolution } from "./tab-dom-tools";
import type { TabRpcService } from "./tab-rpc-service";

const LOAD_FRAME_CONTEXT_TIMEOUT_MS = 5000;
const RESOLVE_HIT_TARGET_TIMEOUT_MS = 3000;
const MAX_IFRAME_NESTING = 8;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});

/**
 * Shared implementation for the M2 and M3 browser drivers. The two manifest
 * versions are identical except for `captureTab` and `invokeJsFn` (which rely
 * on MV2-only background APIs), so those are left `abstract` for the subclasses
 * to provide. Everything else — tab RPC delegation, browser/extension info,
 * DOM interaction, and RPC lifecycle — lives here.
 *
 * This is an internal implementation detail: subclasses own the DI wiring
 * (`@injectable` + `setupContainer`); the base is never bound directly.
 */
export abstract class DrivenBrowserDriverBase
	implements BrowserDriverOutputPort
{
	protected readonly logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		loggerFactory: LoggerFactoryOutputPort,
		protected readonly tabRpcService: TabRpcService,
		protected readonly frameRegistry: FrameRegistryService,
		protected readonly frameCorrelation: FrameCorrelationService,
		loggerName: string,
	) {
		this.logger = loggerFactory.create(loggerName);
	}

	loadTabContext = async (tabId: string): Promise<TabContext> => {
		this.logger.verbose(`Loading tab context for tab: ${tabId}`);

		const frames = await this.frameRegistry.listFrames(tabId);
		const perFrame = await Promise.all(
			frames.map(async (frame) => {
				try {
					const context = await withTimeout(
						this.tabRpcService.tabRpcClient.call({
							method: "loadTabContext",
							args: [],
							extraArgs: {
								tabId,
								frameId: frame.frameId,
							},
						}),
						LOAD_FRAME_CONTEXT_TIMEOUT_MS,
					);
					return {
						frameId: frame.frameId,
						context,
					};
				} catch (error) {
					this.logger.warn(
						`Frame ${frame.frameId} did not respond, excluding from aggregate tab context:`,
						error,
					);
					return undefined;
				}
			}),
		);

		return mergeFrameTabContexts(
			perFrame.filter((result) => result !== undefined),
		);
	};

	// Browser and Extension Info Methods
	getBrowserInfo = (): Promise<BrowserInfo> => {
		this.logger.verbose("Getting browser info");
		return backgroundToolsM3.getBrowserInfo();
	};

	getExtensionInfo = (): Promise<ExtensionInfo> => {
		this.logger.verbose("Getting extension info");
		return backgroundToolsM3.getExtensionInfo();
	};

	getBrowserId = (): Promise<string> => {
		this.logger.verbose("Getting browser ID");
		return backgroundToolsM3.getBrowserId();
	};

	// Tab Management Methods
	getTabs = (): Promise<ExtensionTabInfo[]> => {
		this.logger.verbose("Getting tabs");
		return backgroundToolsM3.getTabs();
	};

	getWindows = async (): Promise<ExtensionWindowInfo[]> => {
		this.logger.verbose("Getting windows");
		return backgroundToolsM3.getWindows();
	};

	openTab = async (
		url: string,
		windowId: string,
	): Promise<{
		tabId: string;
		windowId: string;
	}> => {
		this.logger.info(`Opening tab with URL: ${url} in window: ${windowId}`);
		const result = await backgroundToolsM3.openTab(url, windowId);
		this.logger.info(`Tab opened with ID: ${result.tabId}`);
		return result;
	};

	closeTab = async (tabId: string): Promise<void> => {
		this.logger.info(`Closing tab with ID: ${tabId}`);
		await backgroundToolsM3.closeTab(tabId);
		this.logger.info(`Tab closed: ${tabId}`);
	};

	/** MV2-only: capture the visible tab. Not supported in MV3. */
	abstract captureTab: (tabId: string) => Promise<Screenshot>;

	// DOM Query Methods
	getSelection = (tabId: string): Promise<Selection> => {
		this.logger.verbose(`Getting selection for tab: ${tabId}`);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.getSelection",
			args: [],
			extraArgs: {
				tabId,
			},
		});
	};

	// Scroll Methods
	scrollPage = (
		tabId: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<void> => {
		this.logger.verbose(
			`Scrolling ${direction}${amount != null ? ` by ${amount}px` : ""} in tab: ${tabId}`,
		);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.scrollPage",
			args: [
				direction,
				amount,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	scrollElement = (
		tabId: string,
		readableTreePath: string,
		direction: ScrollDirection,
		amount?: number,
	): Promise<void> => {
		this.logger.verbose(
			`Scrolling element ${readableTreePath} ${direction}${amount != null ? ` by ${amount}px` : ""} in tab: ${tabId}`,
		);
		const { frameId, localPath } = parseFramePath(readableTreePath);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.scrollElement",
			args: [
				localPath,
				direction,
				amount,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});
	};

	/**
	 * Resolves (x, y) — given in `frameId`'s own viewport space — down through
	 * nested `<iframe>` boundaries to the frame that actually contains the
	 * point, translating coordinates at each hop. Best-effort: if a candidate
	 * child frame can't be correlated (no response, or nonce match fails),
	 * falls back to the last-resolved frame/coordinates rather than guessing
	 * a wrong target.
	 */
	private resolveDeepFrame = async (
		tabId: string,
		frameId: string,
		x: number,
		y: number,
		depth = 0,
	): Promise<{
		frameId: string;
		x: number;
		y: number;
	}> => {
		if (depth >= MAX_IFRAME_NESTING) {
			return {
				frameId,
				x,
				y,
			};
		}

		// The correlation wait must be registered before the RPC call that
		// triggers the postMessage — otherwise a fast child response could
		// arrive before anyone is listening for its nonce.
		const nonce = crypto.randomUUID();
		const correlationPromise = this.frameCorrelation.waitForCorrelation(
			nonce,
			RESOLVE_HIT_TARGET_TIMEOUT_MS,
		);

		let hit: HitTargetResolution;
		try {
			hit = await withTimeout(
				this.tabRpcService.tabRpcClient.call({
					method: "dom.resolveHitTarget",
					args: [
						x,
						y,
						nonce,
					],
					extraArgs: {
						tabId,
						frameId,
					},
				}),
				RESOLVE_HIT_TARGET_TIMEOUT_MS,
			);
		} catch (error) {
			this.logger.warn(
				`Frame ${frameId} did not respond while resolving hit target, using it as-is:`,
				error,
			);
			return {
				frameId,
				x,
				y,
			};
		}

		if (hit.kind === "element") {
			return {
				frameId,
				x,
				y,
			};
		}

		const childFrameId = await correlationPromise;

		if (!childFrameId) {
			this.logger.warn(
				`Coordinate (${x},${y}) in frame ${frameId} hit an <iframe> but frame correlation failed — falling back to the outer element.`,
			);
			return {
				frameId,
				x,
				y,
			};
		}

		return this.resolveDeepFrame(
			tabId,
			childFrameId,
			hit.localX,
			hit.localY,
			depth + 1,
		);
	};

	// Interaction Methods (Click/Focus)
	clickOnCoordinates = async (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.verbose(
			`Clicking on coordinates (${x}, ${y}) in tab: ${tabId}`,
		);
		const resolved = await this.resolveDeepFrame(tabId, "0", x, y);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnCoordinates",
			args: [
				resolved.x,
				resolved.y,
			],
			extraArgs: {
				tabId,
				frameId: resolved.frameId,
			},
		});
	};

	clickOnElementByReadablePath = (
		tabId: string,
		readableTreePath: string,
	): Promise<void> => {
		this.logger.verbose(
			`Clicking on element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		const { frameId, localPath } = parseFramePath(readableTreePath);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.clickOnElementByReadablePath",
			args: [
				localPath,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});
	};

	getElementHtmlByReadablePath = (
		tabId: string,
		readablePath: string,
	): Promise<string> => {
		this.logger.verbose(
			`Getting element HTML by readable path: ${readablePath} in tab: ${tabId}`,
		);
		const { frameId, localPath } = parseFramePath(readablePath);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.getElementHtmlByReadablePath",
			args: [
				localPath,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});
	};

	focusOnCoordinates = async (
		tabId: string,
		x: number,
		y: number,
	): Promise<void> => {
		this.logger.verbose(
			`Focusing on coordinates (${x}, ${y}) in tab: ${tabId}`,
		);
		const resolved = await this.resolveDeepFrame(tabId, "0", x, y);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.focusOnCoordinates",
			args: [
				resolved.x,
				resolved.y,
			],
			extraArgs: {
				tabId,
				frameId: resolved.frameId,
			},
		});
	};

	// Input Methods
	fillTextToElementByReadablePath = (
		tabId: string,
		readableTreePath: string,
		value: string,
	): Promise<void> => {
		this.logger.verbose(
			`Filling text to element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		const { frameId, localPath } = parseFramePath(readableTreePath);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToElementByReadablePath",
			args: [
				localPath,
				value,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});
	};

	fillTextToFocusedElement = (tabId: string, value: string): Promise<void> => {
		this.logger.verbose(`Filling text to focused element in tab: ${tabId}`);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.fillTextToFocusedElement",
			args: [
				value,
			],
			extraArgs: {
				tabId,
			},
		});
	};

	hitEnterOnElementByReadablePath = (
		tabId: string,
		readableTreePath: string,
	): Promise<void> => {
		this.logger.verbose(
			`Hitting enter on element by readable path: ${readableTreePath} in tab: ${tabId}`,
		);
		const { frameId, localPath } = parseFramePath(readableTreePath);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnElementByReadablePath",
			args: [
				localPath,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});
	};

	hitEnterOnFocusedElement = (tabId: string): Promise<void> => {
		this.logger.verbose(`Hitting enter on focused element in tab: ${tabId}`);
		return this.tabRpcService.tabRpcClient.call({
			method: "dom.hitEnterOnFocusedElement",
			args: [],
			extraArgs: {
				tabId,
			},
		});
	};

	showHumanHint = async (
		tabId: string,
		params: ShowHumanHintParams,
		humanMessage: string,
	): Promise<HumanHintTabResult> => {
		this.logger.verbose(`Showing human hint in tab: ${tabId}`);
		await backgroundToolsM3.activateTab(tabId);

		const readablePath = params.readablePath;
		const { frameId, localParams } = readablePath
			? ((): {
					frameId: string;
					localParams: ShowHumanHintParams;
				} => {
					const parsed = parseFramePath(readablePath);
					return {
						frameId: parsed.frameId,
						localParams: {
							...params,
							readablePath: parsed.localPath,
						},
					};
				})()
			: {
					frameId: "0",
					localParams: params,
				};

		const result = await this.tabRpcService.tabRpcClient.call({
			method: "showHumanHint",
			args: [
				localParams,
				humanMessage,
			],
			extraArgs: {
				tabId,
				frameId,
			},
		});

		if (result.target?.type === "readablePath") {
			return {
				...result,
				target: {
					...result.target,
					readablePath: buildFramePath(frameId, result.target.readablePath),
				},
			};
		}
		return result;
	};

	// JavaScript Execution Methods
	/** MV2-only: run a function in the page. Not supported in MV3. */
	abstract invokeJsFn: (tabId: string, fnBodyCode: string) => Promise<unknown>;

	// RPC Communication Methods
	linkRpc = (): Func => {
		this.logger.info("Linking RPC communication");
		const unlinkFn = this.tabRpcService.linkRpc();
		this.logger.info("RPC communication linked successfully");
		return unlinkFn;
	};

	unlinkRpc = (): void => {
		this.logger.info("Unlinking RPC communication");
		this.tabRpcService.unlinkRpc();
		this.logger.info("RPC communication unlinked");
	};

	handleTabMessage = (message: unknown): void => {
		this.logger.verbose("Handling tab message");
		this.tabRpcService.handleTabMessage(message);
	};
}
