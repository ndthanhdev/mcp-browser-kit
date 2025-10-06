import { z } from "zod";

/**
 * Common schema for operations requiring only a tab ID
 */
export const tabIdSchema = {
	tabId: z.string().describe("Tab ID to target"),
};

/**
 * Schema for coordinate-based operations (click, fill text, etc.)
 */
export const coordinateSchema = {
	tabId: z.string().describe("Tab ID of the active tab"),
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
	tabId: z.string().describe("Tab ID to target"),
	readablePath: z.string().describe("Element path from getReadableElements"),
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
	tabId: z.string().describe("Tab ID to run JavaScript in"),
	fnBodyCode: z
		.string()
		.describe("JavaScript function body to execute in page context"),
};
