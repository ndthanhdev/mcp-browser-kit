import { z } from "zod";

export const tabKeySchema = {
	tabKey: z.string().describe("Tab key to target"),
};

export const coordinateSchema = {
	tabKey: z.string().describe("Tab key of the active tab"),
	x: z.number().describe("X coordinate (pixels)"),
	y: z.number().describe("Y coordinate (pixels)"),
};

export const coordinateTextInputSchema = {
	...coordinateSchema,
	value: z.string().describe("Text to enter into the input field"),
};

export const readableElementSchema = {
	tabKey: z.string().describe("Tab key to target"),
	readablePath: z.string().describe("Readable path from getReadableElements"),
};

export const readableElementTextInputSchema = {
	...readableElementSchema,
	value: z.string().describe("Text to enter into the input field"),
};

export const invokeJsFnSchema = {
	tabKey: z.string().describe("Tab key to run JavaScript in"),
	fnBodyCode: z
		.string()
		.describe("Function body code to execute in page context"),
};

export const openTabSchema = {
	windowKey: z.string().describe("Window key where the new tab should open"),
	url: z.string().describe("URL to open in the new tab"),
};

export const browserTabContextSchema = {
	tabKey: z.string().describe("Unique key identifying the tab"),
	active: z.boolean().describe("Whether the tab is currently active"),
	title: z.string().describe("Title of the tab"),
	url: z.string().describe("Current URL of the tab"),
};

export const browserWindowContextSchema = {
	windowKey: z.string().describe("Unique key identifying the window"),
	tabs: z
		.array(z.object(browserTabContextSchema))
		.describe("List of tabs in this window"),
};

export const browserContextSchema = {
	browserId: z.string().describe("Unique identifier for the browser"),
	availableTools: z
		.array(z.string())
		.describe("List of available tool names for this browser"),
	browserWindows: z
		.array(z.object(browserWindowContextSchema))
		.describe("List of browser windows"),
};

export const createOverOutputSchema = <T extends Record<string, z.ZodType>>(
	valueSchema: T,
) => ({
	ok: z.boolean().describe("Whether the operation succeeded"),
	value: z
		.object(valueSchema)
		.optional()
		.describe("Result value when ok is true"),
	reason: z.string().optional().describe("Error reason when ok is false"),
});

export const contextOutputSchema = createOverOutputSchema({
	browsers: z
		.array(z.object(browserContextSchema))
		.describe("List of connected browsers"),
});

export const openTabOutputSchema = createOverOutputSchema({
	tabKey: z.string().describe("Key of the newly opened tab"),
	windowKey: z.string().describe("Window key where the tab was opened"),
});

export const readableElementOutputSchema = createOverOutputSchema({
	elements: z
		.array(
			z.tuple([
				z.string().describe("Unique path to identify the element"),
				z.string().describe("Accessible role or tag name of the element"),
				z.string().describe("Accessible text content of the element"),
			]),
		)
		.describe(
			"List of readable elements on the page as [path, role, text] tuples",
		),
});

export const selectionOutputSchema = createOverOutputSchema({
	selectedText: z.string().describe("Selected text on the page"),
});

export const readableTextOutputSchema = createOverOutputSchema({
	innerText: z.string().describe("Inner text content of the page"),
});

export const invokeJsFnOutputSchema = createOverOutputSchema({
	result: z.unknown().describe("Result returned by the JavaScript function"),
});

export const captureTabOutputSchema = createOverOutputSchema({
	width: z.number().describe("Width of the captured screenshot in pixels"),
	height: z.number().describe("Height of the captured screenshot in pixels"),
	mimeType: z.string().describe("MIME type of the captured image"),
});

export const actionOutputSchema = createOverOutputSchema({});

type InferOverValue<T> = T extends {
	value: z.ZodOptional<infer V extends z.ZodType>;
}
	? z.infer<V>
	: Record<string, never>;

type ServerToolOverSchemaMap = {
	getContext: typeof contextOutputSchema;
	captureTab: typeof captureTabOutputSchema;
	invokeJsFn: typeof invokeJsFnOutputSchema;
	openTab: typeof openTabOutputSchema;
	closeTab: typeof actionOutputSchema;
	getSelection: typeof selectionOutputSchema;
	getReadableText: typeof readableTextOutputSchema;
	getReadableElements: typeof readableElementOutputSchema;
	clickOnCoordinates: typeof actionOutputSchema;
	fillTextToCoordinates: typeof actionOutputSchema;
	hitEnterOnCoordinates: typeof actionOutputSchema;
	clickOnElement: typeof actionOutputSchema;
	fillTextToElement: typeof actionOutputSchema;
	hitEnterOnElement: typeof actionOutputSchema;
};

export interface ServerToolOverResult<T extends keyof ServerToolOverSchemaMap> {
	ok: boolean;
	value?: InferOverValue<ServerToolOverSchemaMap[T]>;
	reason?: string;
}
