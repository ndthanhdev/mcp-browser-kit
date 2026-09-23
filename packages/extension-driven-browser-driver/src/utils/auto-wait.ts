import { OVERLAY_ROOT_ID } from "./human-hint-overlay";

export type ActionabilityCheck =
	| "visible"
	| "stable"
	| "enabled"
	| "editable"
	| "receivesEvents";

// setTimeout rather than requestAnimationFrame: rAF is paused in background
// tabs, which would stall every wait until it timed out.
const nextTick = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 16);
	});

const describeElement = (element: Element): string => {
	const id = element.id ? `#${element.id}` : "";
	const classes =
		typeof element.className === "string" && element.className.trim()
			? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
			: "";
	return `<${element.tagName.toLowerCase()}${id}${classes}>`;
};

/** True when `node` is `target` or inside it, crossing shadow-root boundaries. */
const isWithin = (node: Node | null, target: Element): boolean => {
	let current: Node | null = node;
	while (current) {
		if (current === target) return true;
		current =
			current.parentNode ??
			(current instanceof ShadowRoot ? current.host : null);
	}
	return false;
};

const isVisible = (element: HTMLElement): boolean => {
	const rect = element.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return false;
	if (typeof element.checkVisibility === "function") {
		return element.checkVisibility({
			visibilityProperty: true,
		});
	}
	return getComputedStyle(element).visibility !== "hidden";
};

const isDisabled = (element: HTMLElement): boolean =>
	element.matches(":disabled") ||
	element.closest('[aria-disabled="true"]') !== null;

const isReadOnly = (element: HTMLElement): boolean =>
	(element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement) &&
	element.readOnly;

/** Returns why the element does not receive pointer events at its center, if it doesn't. */
const hitTestFailure = (element: HTMLElement): string | undefined => {
	const rect = element.getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + rect.height / 2;
	if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
		element.scrollIntoView({
			block: "center",
			inline: "center",
			behavior: "instant",
		});
		return "outside the viewport";
	}
	const root = element.getRootNode();
	const hit = (root instanceof ShadowRoot ? root : document).elementFromPoint(
		x,
		y,
	);
	if (!hit) return "outside the viewport";
	if (isWithin(hit, element) || isWithin(element, hit)) return undefined;
	return `covered by ${describeElement(hit)}`;
};

/**
 * Playwright-style actionability wait: polls until every requested check
 * passes, scrolling the element into view when needed. Throws with the last
 * failing reason on timeout, and immediately if the element is detached.
 */
export const waitForActionable = async (
	element: HTMLElement,
	checks: ActionabilityCheck[],
	timeoutMs: number,
): Promise<void> => {
	const deadline = performance.now() + timeoutMs;
	let previousRect: DOMRect | undefined;

	while (true) {
		if (!element.isConnected) {
			throw new Error(
				"Element is detached from the document; re-read readable-elements for a fresh path",
			);
		}

		let reason: string | undefined;
		if (checks.includes("visible") && !isVisible(element)) {
			reason = "not visible";
		} else if (checks.includes("enabled") && isDisabled(element)) {
			reason = "disabled";
		} else if (checks.includes("editable") && isReadOnly(element)) {
			reason = "read-only";
		} else if (checks.includes("stable")) {
			const rect = element.getBoundingClientRect();
			const moved =
				!previousRect ||
				rect.x !== previousRect.x ||
				rect.y !== previousRect.y ||
				rect.width !== previousRect.width ||
				rect.height !== previousRect.height;
			previousRect = rect;
			if (moved) reason = "not stable (still moving)";
		}
		if (!reason && checks.includes("receivesEvents")) {
			reason = hitTestFailure(element);
		}

		if (!reason) return;
		if (performance.now() >= deadline) {
			throw new Error(
				`Element ${describeElement(element)} not actionable after ${timeoutMs}ms: ${reason}`,
			);
		}
		await nextTick();
	}
};

const isOwnOverlayMutation = (record: MutationRecord): boolean => {
	const target =
		record.target instanceof Element
			? record.target
			: record.target.parentElement;
	if (target?.closest(`#${OVERLAY_ROOT_ID}`)) return true;
	const nodes = [
		...record.addedNodes,
		...record.removedNodes,
	];
	return (
		nodes.length > 0 &&
		nodes.every(
			(node) => node instanceof Element && node.id === OVERLAY_ROOT_ID,
		)
	);
};

/**
 * Resolves once the DOM has gone `quietMs` without mutations, or after
 * `timeoutMs` for pages that never go quiet. Ignores the extension's own
 * overlay. Animations inject <style> into <head>, outside the observed body.
 */
export const waitForDomQuiet = (
	quietMs: number,
	timeoutMs: number,
): Promise<void> =>
	new Promise((resolve) => {
		let quietTimer: ReturnType<typeof setTimeout> | undefined;
		const finish = () => {
			observer.disconnect();
			clearTimeout(quietTimer);
			clearTimeout(capTimer);
			resolve();
		};
		const rearm = () => {
			clearTimeout(quietTimer);
			quietTimer = setTimeout(finish, quietMs);
		};
		const observer = new MutationObserver((records) => {
			if (records.some((record) => !isOwnOverlayMutation(record))) rearm();
		});
		observer.observe(document.body ?? document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		});
		const capTimer = setTimeout(finish, timeoutMs);
		rearm();
	});
