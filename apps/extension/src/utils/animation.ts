interface ClickAnimationOptions {
	size?: number;
	color?: string;
	duration?: number;
	easing?: string;
	style?: Partial<CSSStyleDeclaration>;
}

export function playClickAnimationAdvance(
	x: number,
	y: number,
	options: ClickAnimationOptions = {},
): void {
	const defaultOptions: Required<ClickAnimationOptions> = {
		size: 20,
		color: "rgba(0, 0, 0, 0.5)",
		duration: 500,
		easing: "ease-out",
		style: {
			borderRadius: "50%",
			pointerEvents: "none",
			position: "absolute",
			zIndex: 9999,
		},
	};

	const mergedOptions: Required<ClickAnimationOptions> = {
		...defaultOptions,
		...options,
	};

	const animationElement = document.createElement("div");

	Object.assign(animationElement.style, mergedOptions.style, {
		width: `${mergedOptions.size}px`,
		height: `${mergedOptions.size}px`,
		backgroundColor: mergedOptions.color,
		left: `${x - mergedOptions.size / 2}px`,
		top: `${y - mergedOptions.size / 2}px`,
		transition: `transform ${mergedOptions.duration}ms ${mergedOptions.easing}, opacity ${mergedOptions.duration}ms ${mergedOptions.easing}`,
		transform: "scale(1)",
		opacity: 1,
	});

	document.body.appendChild(animationElement);

	requestAnimationFrame(() => {
		animationElement.style.transform = "scale(2)";
		animationElement.style.opacity = 0;
	});

	setTimeout(() => {
		if (animationElement && animationElement.parentNode) {
			animationElement.parentNode.removeChild(animationElement);
		}
	}, mergedOptions.duration);
}

export const playClickAnimation = (x: number, y: number) => {
	playClickAnimationAdvance(x, y, {
		duration: 1600,
		size: 60,
		color: "rgba(0, 255, 0, 0.8)",
	});
};

export const playClickAnimationOnElement = (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	playClickAnimation(centerX, centerY);
};
