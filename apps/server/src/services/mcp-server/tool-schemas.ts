import { z } from "zod";

/**
 * Common schema for operations requiring only a tab ID
 */
export const tabKeySchema = {
	tabKey: z.string().describe("Tab key to target"),
};

/**
 * Schema for coordinate-based operations (click, fill text, etc.)
 */
export const coordinateSchema = {
	tabKey: z.string().describe("Tab key of the active tab"),
	x: z.number().describe("X coordinate (pixels)"),
	y: z.number().describe("Y coordinate (pixels)"),
};

/**
 * Schema for coordinate-based text input operations
 */
export const coordinateTextInputSchema = {
	...coordinateSchema,
	value: z.string().describe("Text to enter into the input field"),
};

/**
 * Schema for readable element operations
 */
export const readableElementSchema = {
	tabKey: z.string().describe("Tab key to target"),
	readablePath: z.string().describe("Readable path from getReadableElements"),
};

/**
 * Schema for readable element text input operations
 */
export const readableElementTextInputSchema = {
	...readableElementSchema,
	value: z.string().describe("Text to enter into the input field"),
};

/**
 * Schema for JavaScript function invocation
 */
export const invokeJsFnSchema = {
	tabKey: z.string().describe("Tab key to run JavaScript in"),
	fnBodyCode: z
		.string()
		.describe("Function body code to execute in page context"),
};
