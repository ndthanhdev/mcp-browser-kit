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

export const showHumanHintInputSchema = {
	tabKey: z.string().describe("Tab key to target"),
	action: z
		.enum([
			"click",
			"fill",
			"hit-enter",
		])
		.describe("Manual step the human should take"),
	message: z
		.string()
		.describe("Human-facing instruction shown in browser callout and chat"),
	value: z
		.string()
		.optional()
		.describe("Required for fill — text the human should type"),
	readablePath: z
		.string()
		.optional()
		.describe("Readable path from readable-elements (MV3 / element flow)"),
	x: z
		.number()
		.optional()
		.describe("X coordinate in pixels (MV2 / screenshot flow)"),
	y: z
		.number()
		.optional()
		.describe("Y coordinate in pixels (MV2 / screenshot flow)"),
};

const humanHintTargetSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("readablePath"),
		readablePath: z.string(),
		label: z.string().optional(),
	}),
	z.object({
		type: z.literal("coordinates"),
		x: z.number(),
		y: z.number(),
	}),
]);

export const showHumanHintOutputSchema = {
	ok: z.boolean().describe("Whether the overlay was shown"),
	reason: z.string().optional().describe("Failure reason when ok is false"),
	action: z.enum([
		"click",
		"fill",
		"hit-enter",
	]),
	target: humanHintTargetSchema.optional(),
	value: z.string().optional(),
	message: z.string(),
	humanMessage: z
		.string()
		.describe("Ready-to-relay instruction for the person at the keyboard"),
	tab: z.object({
		title: z.string(),
		url: z.string(),
	}),
	expiresInSeconds: z.number(),
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
	showHumanHint: typeof showHumanHintOutputSchema;
};

export type McpToolName = keyof ServerToolOverSchemaMap;

export interface ServerToolOverResult<T extends McpToolName> {
	ok: boolean;
	value?: InferOverValue<ServerToolOverSchemaMap[T]>;
	reason?: string;
}
