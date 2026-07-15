import type {
	ReadableElementRecord,
	TabContext,
} from "@mcp-browser-kit/core-extension/types";
import { buildFramePath, isTopFrame } from "./frame-path";

export interface FrameTabContext {
	frameId: string;
	context: TabContext;
}

/**
 * Merges each frame's own (frame-local) `TabContext` into one flat context,
 * rewriting `readableElementRecords` paths to be frame-qualified. The top
 * frame ("0") is ordered first and is the only one whose `html` is kept.
 */
export const mergeFrameTabContexts = (
	frameContexts: FrameTabContext[],
): TabContext => {
	const ordered = [
		...frameContexts,
	].sort((a, b) => Number(a.frameId) - Number(b.frameId));

	const readableElementRecords: ReadableElementRecord[] = ordered.flatMap(
		({ frameId, context }) =>
			context.readableElementRecords.map(
				([localPath, role, text, value]): ReadableElementRecord =>
					value === undefined
						? [
								buildFramePath(frameId, localPath),
								role,
								text,
							]
						: [
								buildFramePath(frameId, localPath),
								role,
								text,
								value,
							],
			),
	);

	const textContent = ordered
		.map(({ context }) => context.textContent)
		.filter((text) => text.length > 0)
		.join("\n\n");

	const topFrame = ordered.find(({ frameId }) => isTopFrame(frameId));

	return {
		html: topFrame?.context.html ?? "",
		readableElementRecords,
		textContent,
	};
};
