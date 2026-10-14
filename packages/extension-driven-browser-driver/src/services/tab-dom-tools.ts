import type {
	ScrollDirection,
	Selection,
} from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { LoggerFactoryOutputPort as LoggerFactoryOutputPortSymbol } from "@mcp-browser-kit/core-extension/output-ports";
import type { Logger } from "@mcp-browser-kit/types";
import { inject, injectable } from "inversify";
import { config } from "../config";
import {
	type ActionabilityCheck,
	waitForActionable,
	waitForDomQuiet,
} from "../utils/auto-wait";
import { documentId } from "../utils/document-id";
import * as dom from "../utils/dom-tools";
import { CORRELATE_MESSAGE_TYPE } from "../utils/frame-correlation";
import { TabAnimationTools } from "./tab-animation-tools";
import { TabContextStore } from "./tab-context-store";

const CLICK_CHECKS: ActionabilityCheck[] = [
	"visible",
	"stable",
	"enabled",
	"receivesEvents",
];
const FILL_CHECKS: ActionabilityCheck[] = [
	"visible",
	"enabled",
	"editable",
];
const ENTER_CHECKS: ActionabilityCheck[] = [
	"visible",
	"enabled",
];
// Scroll targets are often layout wrappers with no box of their own, so only
// the attached check (always applied) makes sense.
const SCROLL_CHECKS: ActionabilityCheck[] = [];
// A coordinate target is under the point by definition; it just has to be usable.
const COORDINATE_CHECKS: ActionabilityCheck[] = [
	"enabled",
];

const waitUntilActionable = (
	element: HTMLElement,
	checks: ActionabilityCheck[],
) => waitForActionable(element, checks, config.actionabilityTimeoutMs);

const waitUntilSettled = () =>
	waitForDomQuiet(config.settleQuietMs, config.settleTimeoutMs);

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
 * Returns on the first strategy whose effect is verified. A strategy that
 * throws counts as failed, so the next one still runs.
 * Throws with every strategy's failure reason once all are exhausted.
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
	const failures: string[] = [];
	for (const strategy of strategies) {
		try {
			const success = await dom.performAndVerify(strategy.act, checkState, {
				timeoutMs: config.watchMutationTimeoutMs,
				acceptAnyMutation: options.acceptAnyMutation,
			});
			if (success) return;
			failures.push(`${strategy.label}: no verifiable effect`);
			logger.warn(
				`${operationLabel}: strategy "${strategy.label}" had no verifiable effect — trying next`,
			);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			failures.push(`${strategy.label}: ${reason}`);
			logger.warn(
				`${operationLabel}: strategy "${strategy.label}" threw — trying next:`,
				error,
			);
		}
	}
	throw new Error(
		`${operationLabel}: all ${strategies.length} strategies failed (${failures.join("; ")})`,
	);
};

const fillStrategies = (target: dom.FillTarget, value: string): Strategy[] => {
	switch (target.kind) {
		case "text":
			return [
				{
					label: "human-like-typing",
					act: () => dom.typeTextHumanLike(target.element, value),
				},
				{
					label: "exec-command",
					act: () => dom.fillTextExecCommand(target.element, value),
				},
				{
					label: "native-setter",
					act: async () => dom.fillTextNativeSetter(target.element, value),
				},
			];
		case "value":
			return [
				{
					label: "native-setter",
					act: async () => dom.fillTextNativeSetter(target.element, value),
				},
			];
		case "rich":
			return [
				{
					label: "rich-exec-command",
					act: async () => dom.fillRichTextExecCommand(target.element, value),
				},
				{
					label: "rich-input-events",
					act: async () => dom.fillRichTextInputEvents(target.element, value),
				},
			];
	}
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
		await waitUntilSettled();
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

		await waitUntilActionable(element, SCROLL_CHECKS);
		dom.scrollElement(element, direction, amount ?? undefined);
		await waitUntilSettled();
		this.logger.verbose("Scroll element completed");
	};

	/** Identifies the current document; see `documentId`. */
	getDocumentState = (): {
		documentId: string;
	} => ({
		documentId,
	});

	/** Waits for this frame's DOM to go quiet, then reports the document id. */
	waitForSettled = async (): Promise<{
		documentId: string;
	}> => {
		await waitUntilSettled();
		return {
			documentId,
		};
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
		const target = document.elementFromPoint(x, y);
		if (target instanceof HTMLElement) {
			await waitUntilActionable(target, COORDINATE_CHECKS);
		}
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
		await waitUntilSettled();
		this.logger.verbose("Click on coordinates completed");
	};

	clickOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Clicking on element at path: ${readablePath}`);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		await waitUntilActionable(element, CLICK_CHECKS);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);

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
		await waitUntilSettled();
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
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		const target = dom.resolveFillTarget(element);
		const fillValue = dom.prepareFillValue(target, value);
		await waitUntilActionable(target.element, FILL_CHECKS);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);
		await this.fill(
			`fillTextToElementByReadablePath(${readablePath})`,
			target,
			fillValue,
		);
		this.logger.verbose("Fill text completed");
	};

	fillTextToCoordinates = async (x: number, y: number, value: string) => {
		this.logger.info(
			`Filling text at coordinates (${x}, ${y}), value length: ${value.length}`,
		);
		const element = document.elementFromPoint(x, y);
		if (!element) {
			throw new Error(`No element at coordinates (${x}, ${y})`);
		}

		const target = dom.resolveFillTarget(element);
		const fillValue = dom.prepareFillValue(target, value);
		await waitUntilActionable(target.element, FILL_CHECKS);
		await this.animation.playClickAnimation(x, y);
		await this.fill(`fillTextToCoordinates(${x},${y})`, target, fillValue);
		this.logger.verbose("Fill text at coordinates completed");
	};

	private fill = async (
		operationLabel: string,
		target: dom.FillTarget,
		value: string,
	) => {
		const before = dom.readFillValue(target);
		await withActVerify(
			operationLabel,
			this.logger,
			fillStrategies(target, value),
			() => dom.verifyFillEffect(target, value, before),
		);
		await waitUntilSettled();
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

	getInnerText = async () => {
		this.logger.verbose("Getting inner text");
		await this.animation.playScanAnimation();
		const result = dom.getInnerText();
		this.logger.verbose(`Retrieved inner text (${result.length} characters)`);
		return result;
	};

	hitEnterOnElementByReadablePath = async (readablePath: string) => {
		this.logger.info(`Hitting enter on element at path: ${readablePath}`);
		const element = this.contextStore.getElementFromPath(readablePath);
		if (!element) {
			this.logger.warn(`Element not found at path: ${readablePath}`);
			return;
		}

		await waitUntilActionable(element, ENTER_CHECKS);
		await this.animation.playClickAnimationOnElementByReadablePath(
			readablePath,
		);

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
		await waitUntilSettled();
		this.logger.verbose("Hit enter on element completed");
	};

	hitEnterOnCoordinates = async (x: number, y: number) => {
		this.logger.info(`Hitting enter at coordinates (${x}, ${y})`);
		const element = document.elementFromPoint(x, y);
		if (!(element instanceof HTMLElement)) {
			throw new Error(`No element at coordinates (${x}, ${y})`);
		}

		await waitUntilActionable(element, ENTER_CHECKS);
		await this.animation.playClickAnimation(x, y);

		const prevHref = location.href;

		await withActVerify(
			`hitEnterOnCoordinates(${x},${y})`,
			this.logger,
			[
				{
					label: "dispatch-enter",
					act: () => dom.hitEnterOnElement(element),
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
		await waitUntilSettled();
		this.logger.verbose("Hit enter at coordinates completed");
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
