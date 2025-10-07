import { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-server";
import { over } from "ok-value-error-reason";
import { container } from "../container";

const logger = container
	.get<LoggerFactoryOutputPort>(LoggerFactoryOutputPort)
	.create("toolHelpers");

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
 * Generic tool handler wrapper with automatic error handling and logging
 */
export const createToolHandler = <T extends Record<string, unknown>>(
	toolName: string,
	handler: (params: T) => Promise<unknown>,
	errorMessage: string,
) => {
	return async (params: T) => {
		logger.info(`Executing ${toolName}`, params);

		const result = await over(() => handler(params));

		if (!result.ok) {
			logger.error(`Failed to execute ${toolName}`, {
				...params,
				reason: result.reason,
			});
			return createErrorResponse(errorMessage, String(result.reason));
		}

		logger.verbose(`${toolName} completed successfully`, params);
		return result.value;
	};
};
