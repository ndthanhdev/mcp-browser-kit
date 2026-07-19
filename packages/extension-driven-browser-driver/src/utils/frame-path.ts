const TOP_FRAME_ID = "0";

export const buildFramePath = (frameId: string, localPath: string): string =>
	`${frameId}:${localPath}`;

export const parseFramePath = (
	framePath: string,
): {
	frameId: string;
	localPath: string;
} => {
	const separatorIndex = framePath.indexOf(":");
	if (separatorIndex === -1) {
		throw new Error(`Malformed frame-qualified path: ${framePath}`);
	}
	return {
		frameId: framePath.slice(0, separatorIndex),
		localPath: framePath.slice(separatorIndex + 1),
	};
};

export const isTopFrame = (frameId: string): boolean =>
	frameId === TOP_FRAME_ID;
