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

/**
 * Creates an image response with optional text prefix
 */
export const createImageResponse = (
	screenshot: {
		width: number;
		height: number;
		mimeType: string;
		data: string;
	},
	textPrefix?: string,
) => ({
	content: [
		...(textPrefix
			? [
					{
						type: "text" as const,
						text: textPrefix,
					},
				]
			: []),
		{
			type: "image" as const,
			mimeType: screenshot.mimeType,
			data: screenshot.data,
		},
	],
});
