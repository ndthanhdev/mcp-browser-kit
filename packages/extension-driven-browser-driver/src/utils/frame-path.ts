const FRAME_ID_PATTERN = /^f[0-9a-z]+$/;
const LEGACY_FRAME_ID_PATTERN = /^\d+$/;

export const buildFramePath = (frameId: string, localPath: string): string =>
	`${frameId}:${localPath}`;

/**
 * Splits a frame-qualified path (`f1:e5`) into its frame id and the
 * frame-local element id.
 * @throws if the path is malformed or uses a pre-stable-id numeric frame id.
 */
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
	const frameId = framePath.slice(0, separatorIndex);
	if (LEGACY_FRAME_ID_PATTERN.test(frameId)) {
		throw new Error(
			`"${framePath}" uses a numeric frame id; frame ids are now stable ids (e.g. f1:e1a) — re-read readable-elements`,
		);
	}
	if (!FRAME_ID_PATTERN.test(frameId)) {
		throw new Error(`Malformed frame-qualified path: ${framePath}`);
	}
	return {
		frameId,
		localPath: framePath.slice(separatorIndex + 1),
	};
};
