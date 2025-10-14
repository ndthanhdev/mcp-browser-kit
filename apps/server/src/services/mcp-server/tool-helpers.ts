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
