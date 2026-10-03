import type {
	ReadableElementRecord,
	TabContext,
} from "@mcp-browser-kit/core-extension/types";
import { buildFramePath } from "./frame-path";

export interface FrameTabContext {
	/** Stable frame id (`f…`) used in frame-qualified paths. */
	frameId: string;
	isTopFrame: boolean;
	context: TabContext;
}

/**
 * Merges each frame's own (frame-local) `TabContext` into one flat context,
 * rewriting `readableElementRecords` paths to be frame-qualified. The top
 * frame is ordered first and is the only one whose `html` is kept; the other
 * frames keep their given order.
 */
export const mergeFrameTabContexts = (
	frameContexts: FrameTabContext[],
): TabContext => {
	const ordered = [
		...frameContexts.filter(({ isTopFrame }) => isTopFrame),
		...frameContexts.filter(({ isTopFrame }) => !isTopFrame),
	];

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

	const topFrame = ordered.find(({ isTopFrame }) => isTopFrame);

	return {
		html: topFrame?.context.html ?? "",
		readableElementRecords,
		textContent,
	};
};
