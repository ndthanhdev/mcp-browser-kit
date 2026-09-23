import type { z } from "zod";

/**
 * Extracts the value type from an OVER output schema
 */
type ExtractOverValue<Schema extends Record<string, z.ZodType>> =
	Schema extends {
		value: z.ZodOptional<infer V extends z.ZodType>;
	}
		? z.infer<V>
		: Record<string, never>;

type OverResult<Schema extends Record<string, z.ZodType>> =
	| {
			ok: true;
			value: ExtractOverValue<Schema>;
	  }
	| {
			ok: false;
			reason: string;
	  };

/**
 * Creates an OVER-shaped structured response from a discriminated ok/fail result
 */
export const createOverResponse = <Schema extends Record<string, z.ZodType>>(
	_outputSchema: Schema,
	result: OverResult<Schema>,
	textContent?: string,
) => {
	if (result.ok) {
		return {
			content: [
				{
					type: "text" as const,
					text: textContent ?? JSON.stringify(result.value),
				},
			],
			structuredContent: {
				ok: true,
				value: result.value,
				reason: undefined,
			},
		};
	}
	return {
		content: [
			{
				type: "text" as const,
				text: textContent ?? result.reason,
			},
		],
		structuredContent: {
			ok: false,
			value: undefined,
			reason: result.reason,
		},
	};
};

interface PageChangeSummary {
	changed: boolean;
	navigated: boolean;
	url: string;
	added: number;
	removed: number;
	tooLarge: boolean;
	pathsShifted: boolean;
	diff?: string;
}

/**
 * Renders a page change as the text an agent reads: a one-line summary, then
 * the diff in a fenced block, or a pointer to the full snapshot when omitted.
 */
export const formatPageChange = (change: PageChangeSummary): string => {
	if (change.navigated) {
		return `Done. Navigated to ${change.url} — read readable-elements for the new page.`;
	}
	if (!change.changed) {
		return change.pathsShifted
			? "Done. No readable elements changed, but element paths shifted — re-read readable-elements before reusing older paths."
			: "Done. No readable elements changed.";
	}

	const counts = `${change.added} added, ${change.removed} removed`;
	const shiftNote = change.pathsShifted
		? "\nPaths outside this diff may have shifted — re-read readable-elements before reusing older paths."
		: "";
	if (change.tooLarge || !change.diff) {
		return `Done. Page changed (${counts}); diff too large to show — read readable-elements for the full snapshot.`;
	}
	return `Done. Page changed (${counts}).\n\`\`\`diff\n${change.diff}\n\`\`\`${shiftNote}`;
};
