import type {
	HumanHintAction,
	HumanHintTarget,
	ShowHumanHintParams,
} from "@mcp-browser-kit/types";

export const buildHumanMessage = (
	action: HumanHintAction,
	message: string,
	value?: string,
): string => {
	const trimmed = message.trim();

	if (action === "fill" && value !== undefined) {
		const base = `Please type "${value}" into the highlighted field.`;
		return trimmed ? `${base} ${trimmed}` : base;
	}

	if (action === "click") {
		const base = "Please click the highlighted element.";
		return trimmed ? `${base} ${trimmed}` : base;
	}

	const base = "Please press Enter on the highlighted element.";
	return trimmed ? `${base} ${trimmed}` : base;
};

export const validateShowHumanHintParams = (
	params: ShowHumanHintParams,
): string | undefined => {
	if (params.action === "fill" && !params.value?.trim()) {
		return "fill action requires value";
	}

	const hasPath = Boolean(params.readablePath?.trim());
	const hasCoords = params.x !== undefined && params.y !== undefined;

	if (hasPath && hasCoords) {
		return "provide readablePath or x and y, not both";
	}

	if (!hasPath && !hasCoords) {
		return "provide readablePath or x and y";
	}

	return undefined;
};

export const targetFromParams = (
	params: ShowHumanHintParams,
	label?: string,
): HumanHintTarget | undefined => {
	if (params.readablePath?.trim()) {
		return {
			type: "readablePath",
			readablePath: params.readablePath.trim(),
			label,
		};
	}

	if (params.x !== undefined && params.y !== undefined) {
		return {
			type: "coordinates",
			x: params.x,
			y: params.y,
		};
	}

	return undefined;
};
