import { playClickAnimationAdvance } from "./animation-tools";

const OVERLAY_ROOT_ID = "mbk-human-hint-root";
const HINT_TIMEOUT_MS = 60_000;

type Anchor =
	| {
			type: "element";
			element: HTMLElement;
	  }
	| {
			type: "coordinates";
			x: number;
			y: number;
	  };

interface ActiveHint {
	targetKey: string;
	timeoutId: ReturnType<typeof setTimeout>;
	cleanupNavigation: () => void;
	updatePosition: () => void;
	resizeObserver?: ResizeObserver;
}

let activeHint: ActiveHint | null = null;

const clearActiveHint = (): void => {
	if (activeHint) {
		clearTimeout(activeHint.timeoutId);
		activeHint.cleanupNavigation();
		window.removeEventListener("scroll", activeHint.updatePosition, true);
		window.removeEventListener("resize", activeHint.updatePosition);
		activeHint.resizeObserver?.disconnect();
	}
	document.getElementById(OVERLAY_ROOT_ID)?.remove();
	activeHint = null;
};

const positionCallout = (
	callout: HTMLElement,
	rect: DOMRect,
	point?: {
		x: number;
		y: number;
	},
): void => {
	const margin = 12;
	let top = rect.bottom + margin;
	let left = point ? point.x - callout.offsetWidth / 2 : rect.left;

	const maxLeft = window.innerWidth - callout.offsetWidth - margin;
	left = Math.max(margin, Math.min(left, maxLeft));
	top = Math.min(top, window.innerHeight - callout.offsetHeight - margin);

	callout.style.top = `${top}px`;
	callout.style.left = `${left}px`;
};

const updateOverlayLayout = (root: HTMLElement, anchor: Anchor): void => {
	const ring = root.querySelector<HTMLElement>("[data-mbk-hint-ring]");
	const callout = root.querySelector<HTMLElement>("[data-mbk-hint-callout]");
	if (!ring || !callout) return;

	if (anchor.type === "element") {
		const rect = anchor.element.getBoundingClientRect();
		ring.style.top = `${rect.top - 4}px`;
		ring.style.left = `${rect.left - 4}px`;
		ring.style.width = `${rect.width + 8}px`;
		ring.style.height = `${rect.height + 8}px`;
		positionCallout(callout, rect);
		return;
	}

	const size = 24;
	ring.style.top = `${anchor.y - size / 2}px`;
	ring.style.left = `${anchor.x - size / 2}px`;
	ring.style.width = `${size}px`;
	ring.style.height = `${size}px`;
	positionCallout(callout, new DOMRect(anchor.x, anchor.y, 0, 0), anchor);
};

const createOverlayRoot = (humanMessage: string): HTMLElement => {
	const root = document.createElement("div");
	root.id = OVERLAY_ROOT_ID;
	root.style.cssText =
		"position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,sans-serif;";

	const ring = document.createElement("div");
	ring.dataset.mbkHintRing = "true";
	ring.style.cssText =
		"position:fixed;box-sizing:border-box;border:3px solid rgba(255,180,0,0.95);border-radius:8px;box-shadow:0 0 0 4px rgba(255,180,0,0.25),0 8px 24px rgba(0,0,0,0.25);pointer-events:none;transition:top 120ms ease,left 120ms ease,width 120ms ease,height 120ms ease;";

	const callout = document.createElement("div");
	callout.dataset.mbkHintCallout = "true";
	callout.style.cssText =
		"position:fixed;max-width:min(360px,calc(100vw - 24px));padding:12px 40px 12px 12px;background:#1f2937;color:#f9fafb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.35);pointer-events:auto;line-height:1.45;font-size:14px;";

	const text = document.createElement("div");
	text.dataset.mbkHintText = "true";
	text.textContent = humanMessage;
	callout.appendChild(text);

	const dismiss = document.createElement("button");
	dismiss.type = "button";
	dismiss.setAttribute("aria-label", "Dismiss hint");
	dismiss.textContent = "\u00d7";
	dismiss.style.cssText =
		"position:absolute;top:6px;right:8px;border:none;background:transparent;color:#f9fafb;font-size:20px;line-height:1;cursor:pointer;padding:4px;";
	dismiss.addEventListener("click", () => clearActiveHint());
	callout.appendChild(dismiss);

	root.appendChild(ring);
	root.appendChild(callout);
	return root;
};

const watchNavigation = (onNavigate: () => void): (() => void) => {
	let lastHref = location.href;
	const onMaybeNavigate = () => {
		if (location.href !== lastHref) {
			lastHref = location.href;
			onNavigate();
		}
	};

	window.addEventListener("popstate", onNavigate);
	window.addEventListener("hashchange", onNavigate);
	const intervalId = window.setInterval(onMaybeNavigate, 500);

	return () => {
		window.removeEventListener("popstate", onNavigate);
		window.removeEventListener("hashchange", onNavigate);
		window.clearInterval(intervalId);
	};
};

const pulseAnchor = async (anchor: Anchor): Promise<void> => {
	const cx =
		anchor.type === "element"
			? anchor.element.getBoundingClientRect().left +
				anchor.element.getBoundingClientRect().width / 2
			: anchor.x;
	const cy =
		anchor.type === "element"
			? anchor.element.getBoundingClientRect().top +
				anchor.element.getBoundingClientRect().height / 2
			: anchor.y;
	await playClickAnimationAdvance(cx, cy, {
		duration: 900,
		size: 48,
		color: "rgba(255, 180, 0, 0.85)",
	});
};

export const showHumanHintOverlay = async (options: {
	targetKey: string;
	humanMessage: string;
	anchor: Anchor;
}): Promise<void> => {
	const replacingSameTarget = activeHint?.targetKey === options.targetKey;
	if (!replacingSameTarget) {
		clearActiveHint();
	}

	let root = document.getElementById(OVERLAY_ROOT_ID);
	if (!root) {
		root = createOverlayRoot(options.humanMessage);
		document.body.appendChild(root);
	} else {
		const text = root.querySelector<HTMLElement>("[data-mbk-hint-text]");
		if (text) text.textContent = options.humanMessage;
	}

	if (options.anchor.type === "element") {
		options.anchor.element.scrollIntoView({
			block: "center",
			inline: "nearest",
			behavior: "smooth",
		});
	}

	const capturedRoot = root;
	const updatePosition = () =>
		updateOverlayLayout(capturedRoot, options.anchor);
	updatePosition();
	await pulseAnchor(options.anchor);
	updatePosition();

	if (activeHint) {
		clearTimeout(activeHint.timeoutId);
		activeHint.targetKey = options.targetKey;
		activeHint.updatePosition = updatePosition;
		activeHint.timeoutId = setTimeout(() => clearActiveHint(), HINT_TIMEOUT_MS);
		return;
	}

	const cleanupNavigation = watchNavigation(() => clearActiveHint());
	const resizeObserver =
		options.anchor.type === "element"
			? new ResizeObserver(updatePosition)
			: undefined;
	if (options.anchor.type === "element") {
		resizeObserver?.observe(options.anchor.element);
	}

	activeHint = {
		targetKey: options.targetKey,
		timeoutId: setTimeout(() => clearActiveHint(), HINT_TIMEOUT_MS),
		cleanupNavigation,
		updatePosition,
		resizeObserver,
	};

	window.addEventListener("scroll", updatePosition, true);
	window.addEventListener("resize", updatePosition);
};

export const buildHumanHintTargetKey = (params: {
	readablePath?: string;
	x?: number;
	y?: number;
}): string => {
	if (params.readablePath?.trim()) return `path:${params.readablePath.trim()}`;
	return `coords:${params.x}:${params.y}`;
};
