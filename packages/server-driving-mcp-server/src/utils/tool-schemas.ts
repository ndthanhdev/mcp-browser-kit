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
	readablePath: z
		.string()
		.describe("Readable path from the readable-elements resource"),
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

export const openTabOutputSchema = createOverOutputSchema({
	tabKey: z.string().describe("Key of the newly opened tab"),
	windowKey: z.string().describe("Window key where the tab was opened"),
});

export const selectionOutputSchema = createOverOutputSchema({
	selectedText: z.string().describe("Selected text on the page"),
});

export const invokeJsFnOutputSchema = createOverOutputSchema({
	result: z.unknown().describe("Result returned by the JavaScript function"),
});

export const captureTabOutputSchema = createOverOutputSchema({
	width: z.number().describe("Width of the captured screenshot in pixels"),
	height: z.number().describe("Height of the captured screenshot in pixels"),
	mimeType: z.string().describe("MIME type of the captured image"),
	data: z.string().describe("Base64-encoded screenshot image data"),
});

export const actionOutputSchema = createOverOutputSchema({});

type InferOverValue<T> = T extends {
	value: z.ZodOptional<infer V extends z.ZodType>;
}
	? z.infer<V>
	: Record<string, never>;

type ServerToolOverSchemaMap = {
	captureTab: typeof captureTabOutputSchema;
	invokeJsFn: typeof invokeJsFnOutputSchema;
	openTab: typeof openTabOutputSchema;
	closeTab: typeof actionOutputSchema;
	getSelection: typeof selectionOutputSchema;
	clickOnCoordinates: typeof actionOutputSchema;
	fillTextToCoordinates: typeof actionOutputSchema;
	hitEnterOnCoordinates: typeof actionOutputSchema;
	clickOnElement: typeof actionOutputSchema;
	fillTextToElement: typeof actionOutputSchema;
	hitEnterOnElement: typeof actionOutputSchema;
};

export type McpToolName = keyof ServerToolOverSchemaMap;

export interface ServerToolOverResult<T extends McpToolName> {
	ok: boolean;
	value?: InferOverValue<ServerToolOverSchemaMap[T]>;
	reason?: string;
}
