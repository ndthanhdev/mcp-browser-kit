import type {
	ScrollDirection,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type { Logger } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import { config } from "../config";
import * as dom from "../utils/dom-tools";
import { CORRELATE_MESSAGE_TYPE } from "../utils/frame-correlation";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";

interface Strategy {
	label: string;
	act: () => Promise<void>;
}

export type HitTargetResolution =
	| {
			kind: "element";
	  }
	| {
			kind: "iframe";
			localX: number;
			localY: number;
	  };

/**
 * Iterates `strategies` in order. Runs dom.performAndVerify for each strategy.
 * Returns on the first strategy whose effect is verified.
 * Throws if all strategies are exhausted without a verified effect.
 */
const withActVerify = async (
	operationLabel: string,
	logger: Logger,
	strategies: Strategy[],
	checkState: () => boolean,
	options: {
		acceptAnyMutation?: boolean;
	} = {},
): Promise<void> => {
	for (const strategy of strategies) {
		const success = await dom.performAndVerify(strategy.act, checkState, {
			timeoutMs: config.watchMutationTimeoutMs,
			acceptAnyMutation: options.acceptAnyMutation,
		});
		if (success) return;
		logger.warn(
			`${operationLabel}: strategy "${strategy.label}" had no verifiable effect — trying next`,
		);
	}
	throw new Error(
		`${operationLabel}: all ${strategies.length} strategies failed to produce a verifiable effect`,
	);
};

@injectable()
export class TabDomTools {
	private readonly logger;

	constructor(
		@inject(LoggerFactoryOutputPortSymbol)
		private readonly loggerFactory: LoggerFactoryOutputPort,
		@inject(TabContextStore) private readonly contextStore: TabContextStore,
		@inject(TabAnimationTools) private readonly animation: TabAnimationTools,
	) {
		this.logger = this.loggerFactory.create("TabDomTools");
	}

	scrollPage = async (direction: ScrollDirection, amount?: number) => {
		this.logger.info(
			`Scrolling ${direction}${amount != null ? ` by ${amount}px` : ""}`,
		);
		dom.scrollPage(direction, amount ?? undefined);
		this.logger.verbose("Scroll completed");
	};

	scrollElement = async (
		readablePath: string,
		direction: ScrollDirection,
		amount?: number,
	) => {
		this.logger.info(
			`Scrolling element at path: ${readablePath} ${direction}${amount != null ? ` by ${amount}px` : ""}`,
		);

		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		dom.scrollElement(element, direction, amount ?? undefined);
		this.logger.verbose("Scroll element completed");
	};

	/**
	 * Reports whether (x, y) lands on a real element in this frame, or on an
	 * `<iframe>` that must be resolved to a specific child frame first. Never
	 * clicks the `<iframe>` element itself — see `clickOnCoordinates`.
	 */
	resolveHitTarget = (
		x: number,
		y: number,
		correlationNonce: string,
	): HitTargetResolution => {
		this.logger.verbose(`Resolving hit target at (${x}, ${y})`);
		const element = document.elementFromPoint(x, y);
		if (element instanceof HTMLIFrameElement) {
			element.contentWindow?.postMessage(
				{
					type: CORRELATE_MESSAGE_TYPE,
					nonce: correlationNonce,
				},
				"*",
			);
			const rect = element.getBoundingClientRect();
			return {
				kind: "iframe",
				localX: x - rect.left,
				localY: y - rect.top,
			};
		}
		return {
			kind: "element",
		};
	};

	clickOnCoordinates = async (x: number, y: number) => {
		this.logger.info(`Clicking on coordinates (${x}, ${y})`);
		await this.animation.playClickAnimation(x, y);

		const element = document.elementFromPoint(x, y) as HTMLElement | null;
		const prevActiveEl = document.activeElement;
		const prevAriaPressed = element?.getAttribute("aria-pressed");
		const prevAriaExpanded = element?.getAttribute("aria-expanded");

		await withActVerify(
			`clickOnCoordinates(${x},${y})`,
			this.logger,
			[
				{
					label: "element-click",
					act: async () => dom.clickOnCoordinates(x, y),
				},
				{
					label: "mouse-event-chain",
					act: async () => {
						if (element) dom.clickOnElementFallback(element);
					},
				},
			],
			() =>
				document.activeElement !== prevActiveEl ||
				element?.getAttribute("aria-pressed") !== prevAriaPressed ||
				element?.getAttribute("aria-expanded") !== prevAriaExpanded,
			{
				acceptAnyMutation: true,
			},
		);
		this.logger.verbose("Click on coordinates completed");
	};

	clickOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Clicking on element at path: ${readablePath}`);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);

		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		const prevActiveEl = document.activeElement;
		const prevAriaPressed = element.getAttribute("aria-pressed");
		const prevAriaExpanded = element.getAttribute("aria-expanded");

		await withActVerify(
			`clickOnElementByReadablePath(${readablePath})`,
			this.logger,
			[
				{
					label: "element-click",
					act: async () => dom.clickOnElementByReadablePath(element),
				},
				{
					label: "mouse-event-chain",
					act: async () => dom.clickOnElementFallback(element),
				},
			],
			() =>
				document.activeElement !== prevActiveEl ||
				element.getAttribute("aria-pressed") !== prevAriaPressed ||
				element.getAttribute("aria-expanded") !== prevAriaExpanded,
			{
				acceptAnyMutation: true,
			},
		);
		this.logger.verbose("Click on element completed");
	};

	getElementHtmlByReadablePath = async (
		readablePath: string,
	): Promise<string> => {
		this.logger.info(`Getting HTML for element at path: ${readablePath}`);

		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			throw new Error(`Element not found at path: ${readablePath}`);
		}

		const html = element.outerHTML;
		this.logger.verbose(`Retrieved element HTML (${html.length} characters)`);
		return html;
	};

	fillTextToElementByReadablePath = async (
		readablePath: string,
		value: string,
	) => {
		this.logger.info(
			`Filling text to element at path: ${readablePath}, value length: ${value.length}`,
		);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);

		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		await withActVerify(
			`fillTextToElementByReadablePath(${readablePath})`,
			this.logger,
			[
				{
					label: "human-like-typing",
					act: async () => dom.fillTextToElementByReadablePath(element, value),
				},
				{
					label: "exec-command",
					act: async () => dom.fillTextExecCommand(element, value),
				},
				{
					label: "native-setter",
					act: async () => dom.fillTextNativeSetter(element, value),
				},
			],
			() => dom.verifyFillEffect(element, value),
		);
		this.logger.verbose("Fill text completed");
	};

	fillTextToFocusedElement = async (value: string) => {
		this.logger.info(
			`Filling text to focused element, value length: ${value.length}`,
		);
		const focusedElement = document.activeElement;
		if (focusedElement) {
			await this.animation.playClickAnimationOnElement(focusedElement);
		}

		const element =
			focusedElement instanceof HTMLElement ? focusedElement : null;

		await withActVerify(
			"fillTextToFocusedElement",
			this.logger,
			[
				{
					label: "human-like-typing",
					act: async () => dom.fillTextToFocusedElement(value),
				},
				{
					label: "exec-command",
					act: async () => {
						if (element) await dom.fillTextExecCommand(element, value);
					},
				},
				{
					label: "native-setter",
					act: async () => {
						if (element) dom.fillTextNativeSetter(element, value);
					},
				},
			],
			() => (element ? dom.verifyFillEffect(element, value) : true),
		);
		this.logger.verbose("Fill text to focused element completed");
	};

	focusOnElement = async (readablePath: string) => {
		this.logger.info(`Focusing on element at path: ${readablePath}`);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}
		const result = dom.focusOnElement(element);
		this.logger.verbose("Focus on element completed");
		return result;
	};

	focusOnCoordinates = async (x: number, y: number) => {
		this.logger.info(`Focusing on coordinates (${x}, ${y})`);
		await this.animation.playClickAnimation(x, y);
		const result = dom.focusOnCoordinates(x, y);
		this.logger.verbose("Focus on coordinates completed");
		return result;
	};

	getInnerText = async () => {
		this.logger.verbose("Getting inner text");
		await this.animation.playScanAnimation();
		const result = dom.getInnerText();
		this.logger.verbose(`Retrieved inner text (${result.length} characters)`);
		return result;
	};

	hitEnterOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Hitting enter on element at path: ${readablePath}`);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);

		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		const prevHref = location.href;

		await withActVerify(
			`hitEnterOnElementByReadablePath(${readablePath})`,
			this.logger,
			[
				{
					label: "dispatch-enter",
					act: async () => dom.hitEnterOnElementByReadablePath(element),
				},
				{
					label: "request-submit",
					act: async () => dom.hitEnterRequestSubmit(element),
				},
				{
					label: "submit-button-click",
					act: async () => dom.hitEnterSubmitButton(element),
				},
			],
			() => location.href !== prevHref,
			{
				acceptAnyMutation: true,
			},
		);
		this.logger.verbose("Hit enter on element completed");
	};

	hitEnterOnFocusedElement = async () => {
		this.logger.info("Hitting enter on focused element");
		const focusedElement = document.activeElement;
		if (focusedElement) {
			await this.animation.playClickAnimationOnElement(focusedElement);
		}

		const element =
			focusedElement instanceof HTMLElement ? focusedElement : null;
		const prevHref = location.href;

		await withActVerify(
			"hitEnterOnFocusedElement",
			this.logger,
			[
				{
					label: "dispatch-enter",
					act: async () => dom.hitEnterOnFocusedElement(),
				},
				{
					label: "request-submit",
					act: async () => {
						if (element) dom.hitEnterRequestSubmit(element);
					},
				},
				{
					label: "submit-button-click",
					act: async () => {
						if (element) dom.hitEnterSubmitButton(element);
					},
				},
			],
			() => location.href !== prevHref,
			{
				acceptAnyMutation: true,
			},
		);
		this.logger.verbose("Hit enter on focused element completed");
	};

	getSelection = async (): Promise<Selection> => {
		this.logger.verbose("Getting text selection");
		await this.animation.playScanAnimation();
		const result = dom.getSerializableSelection();
		this.logger.verbose(
			`Retrieved selection: ${result.selectedText ? `"${result.selectedText.substring(0, 50)}..."` : "none"}`,
		);
		return result;
	};
}
