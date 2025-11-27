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

/**
 * Schema for opening a new tab
 */
export const openTabSchema = {
	windowKey: z.string().describe("Window key where the new tab should open"),
	url: z.string().describe("URL to open in the new tab"),
};

// ========== Output Schemas ==========

/**
 * Output schema for tab information
 */
export const tabInfoOutputSchema = {
	tabKey: z.string().describe("Unique key identifying the tab"),
	windowKey: z.string().describe("Window key where the tab is located"),
	url: z.string().describe("Current URL of the tab"),
	title: z.string().describe("Title of the tab"),
};

/**
 * Output schema for browser context (array of tabs)
 */
export const browserContextOutputSchema = {
	tabs: z.array(z.object(tabInfoOutputSchema)).describe("List of open tabs"),
};

/**
 * Output schema for opening a new tab
 */
export const openTabOutputSchema = {
	tabKey: z.string().describe("Key of the newly opened tab"),
	windowKey: z.string().describe("Window key where the tab was opened"),
};

/**
 * Output schema for readable elements
 */
export const readableElementOutputSchema = {
	elements: z
		.array(
			z.object({
				readablePath: z.string().describe("Unique path to identify the element"),
				tagName: z.string().describe("HTML tag name of the element"),
				text: z.string().optional().describe("Text content of the element"),
					attributes: z
					.record(z.string(), z.string())
					.optional()
					.describe("HTML attributes of the element"),
			}),
		)
		.describe("List of readable elements on the page"),
};

/**
 * Output schema for text selection
 */
export const selectionOutputSchema = {
	selection: z.string().nullable().describe("Selected text on the page, or null if none"),
};

/**
 * Output schema for readable text
 */
export const readableTextOutputSchema = {
	innerText: z.string().nullable().describe("Inner text content of the page"),
};

/**
 * Output schema for JavaScript function result
 */
export const invokeJsFnOutputSchema = {
	result: z.unknown().describe("Result returned by the JavaScript function"),
};
