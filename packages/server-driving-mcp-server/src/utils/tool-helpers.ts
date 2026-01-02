import type { z } from "zod";

/**
 * Creates a standardized error response for MCP tools
 */
export const createErrorResponse = (errorMessage: string, reason: string) => ({
	content: [
		{
			type: "text" as const,
			text: `${errorMessage}: ${reason}`,
		},
	],
});

/**
 * Creates a standardized text response for MCP tools
 */
export const createTextResponse = (text: string) => ({
	content: [
		{
			type: "text" as const,
			text,
		},
	],
});

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

/**
 * Helper type to infer TypeScript type from schema object
 */
type InferSchemaType<Schema> = {
	[K in keyof Schema]: Schema[K] extends z.ZodType<infer U> ? U : never;
};

/**
 * Creates a structured response with both content and structuredContent for MCP tools with output schemas
 */
export const createStructuredResponse = <
	Schema extends Record<string, z.ZodType>,
>(
	_outputSchema: Schema,
	structuredContent: InferSchemaType<Schema>,
	textContent?: string,
) => ({
	content: [
		{
			type: "text" as const,
			text: textContent ?? JSON.stringify(structuredContent),
		},
	],
	structuredContent,
});
