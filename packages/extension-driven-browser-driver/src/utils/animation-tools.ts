import delay from "delay";

export interface ClickAnimationOptions {
	size?: number;
	color?: string;
	duration?: number;
	easing?: string;
	style?: Partial<CSSStyleDeclaration>;
}

export interface ScanAnimationOptions {
	width?: number;
	color?: string;
	duration?: number;
	easing?: string;
}

const defaultOptions: Required<ClickAnimationOptions> = {
	size: 20,
	color: "rgba(0, 0, 0, 0.5)",
	duration: 500,
	easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // easeOutQuad - smooth and snappy
	style: {
		borderRadius: "50%",
		pointerEvents: "none",
		position: "absolute",
		zIndex: "9999",
	},
};
3;

const defaultScanOptions: Required<ScanAnimationOptions> = {
	width: 3,
	color: "rgba(0, 255, 0, 0.8)",
	duration: 1300,
	easing: "cubic-bezier(0.42, 0, 0.58, 1)", // easeInOut - smooth acceleration and deceleration like a real scanner
};

/**
 * Core animation helper that injects CSS and cleans up after animation completes
 */
async function runAnimation(
	cssContent: string,
	duration: number,
): Promise<void> {
	const animationId = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	const styleElement = document.createElement("style");
	styleElement.id = animationId;
	styleElement.textContent = cssContent;

	document.head.appendChild(styleElement);

	// Wait for animation to complete
	await new Promise<void>((resolve) => {
		setTimeout(() => {
			// Remove the style element to clean up
			if (styleElement.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
			resolve();
		}, duration);
	});

	await delay(duration / 2);
}

export async function playClickAnimationAdvance(
	x: number,
	y: number,
	options: ClickAnimationOptions = {},
): Promise<void> {
	const mergedOptions: Required<ClickAnimationOptions> = {
		...defaultOptions,
		...options,
	};

	const animationId = `click-anim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	const cssContent = `
		@keyframes ${animationId} {
			from {
				transform: scale(1);
				opacity: 1;
			}
			to {
				transform: scale(2);
				opacity: 0;
			}
		}
		
		body::after {
			content: '';
			position: fixed;
			width: ${mergedOptions.size}px;
			height: ${mergedOptions.size}px;
			background-color: ${mergedOptions.color};
			border-radius: ${mergedOptions.style.borderRadius || "50%"};
			left: ${x - mergedOptions.size / 2}px;
			top: ${y - mergedOptions.size / 2}px;
			pointer-events: none;
			z-index: ${mergedOptions.style.zIndex || "9999"};
			box-shadow: 
				0 0 15px 5px ${mergedOptions.color},
				0 0 30px 10px ${mergedOptions.color.replace(/[\d.]+\)$/g, "0.5)")},
				0 0 50px 15px ${mergedOptions.color.replace(/[\d.]+\)$/g, "0.2)")};
			animation: ${animationId} ${mergedOptions.duration}ms ${mergedOptions.easing} forwards;
		}
	`;

	await runAnimation(cssContent, mergedOptions.duration);
}

export async function playScanAnimationAdvance(
	options: ScanAnimationOptions = {},
): Promise<void> {
	const mergedOptions: Required<ScanAnimationOptions> = {
		...defaultScanOptions,
		...options,
	};

	const animationId = `scan-anim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

	const cssContent = `
		@keyframes ${animationId} {
			from {
				left: 0;
				opacity: 1;
			}
			to {
				left: 100%;
				opacity: 1;
			}
		}
		
		body::after {
			content: '';
			position: fixed;
			width: ${mergedOptions.width}px;
			height: 100vh;
			background-color: ${mergedOptions.color};
			top: 0;
			left: 0;
			pointer-events: none;
			z-index: 9999;
			box-shadow: 
				0 0 20px 10px ${mergedOptions.color},
				0 0 40px 20px rgba(0, 255, 0, 0.3),
				0 0 60px 30px rgba(0, 255, 0, 0.1);
			animation: ${animationId} ${mergedOptions.duration}ms ${mergedOptions.easing} forwards;
		}
	`;

	await runAnimation(cssContent, mergedOptions.duration);
}

export const playClickAnimation = async (x: number, y: number) => {
	await playClickAnimationAdvance(x, y, {
		duration: 1600,
		size: 60,
		color: "rgba(0, 255, 0, 0.8)",
	});
};

export const playScanAnimation = async () => {
	await playScanAnimationAdvance();
};

export const playClickAnimationOnElement = async (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	await playClickAnimation(centerX, centerY);
};
