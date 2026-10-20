import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject, TestAppPage } from "../pages";
import { expectToBeDefined } from "../test-utils/assert-defined";

type ReadableRecord = [
	string,
	string,
	string,
	string?,
];

const openRichInputTest = async (
	testAppPage: TestAppPage,
	mcpClientPage: McpClientPageObject,
) => {
	await testAppPage.navigateToRichInputTest();
	const tab = await mcpClientPage.waitForTabByUrl(
		testAppPage.page,
		"rich-input-test",
	);
	const tabUri = await mcpClientPage.waitForTabUriByUrl(
		testAppPage.page,
		"rich-input-test",
	);
	const readElements = async () =>
		(await mcpClientPage.readAllSnapshotElements(tabUri)) as ReadableRecord[];
	const findPath = async (role: string, text: string) => {
		const path = (await readElements()).find(
			(el) => el[1] === role && el[2]?.includes(text),
		)?.[0];
		expectToBeDefined(path);
		return path;
	};
	return {
		tab,
		readElements,
		findPath,
	};
};

test.describe("Rich Input Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("Quill editor", () => {
		test("lists the editor as a textbox labelled by its placeholder", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { readElements } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);

			const editor = (await readElements()).find(
				(el) => el[1] === "textbox" && el[2] === "Compose a message...",
			);
			expect(editor).toBeDefined();
		});

		test("fills text by readable path and syncs Quill's model", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath, readElements } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const editorPath = await findPath("textbox", "Compose a message...");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: editorPath,
				value: "Hello from MCP",
			});

			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getRichInputTestLocators();
			await expect(locators.quillText).toHaveText("Hello from MCP");
			const editor = (await readElements()).find((el) => el[0] === editorPath);
			expect(editor?.[3]).toBe("Hello from MCP");
		});

		test("replaces existing content and keeps line breaks", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const editorPath = await findPath("textbox", "Compose a message...");

			await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: editorPath,
				value: "Draft that should disappear",
			});
			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: editorPath,
				value: "Line one\nLine two",
			});

			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getRichInputTestLocators();
			await expect(locators.quillText).toHaveText("Line one\nLine two");
		});

		test("fills text at coordinates inside the editor", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab } = await openRichInputTest(testAppPage, mcpClientPage);
			const locators = testAppPage.getRichInputTestLocators();
			const box = await locators.quillEditor.boundingBox();
			expectToBeDefined(box);

			const result = await mcpClientPage.callTool("fillTextToCoordinates", {
				...tab,
				x: box.x + 20,
				y: box.y + 15,
				value: "Typed by coordinates",
			});

			expect(result.structuredContent?.ok).toBe(true);
			await expect(locators.quillText).toHaveText("Typed by coordinates");
		});
	});

	test.describe("native inputs", () => {
		for (const { label, testId, value, expected } of [
			{
				label: "Appointment date",
				testId: "dateInput",
				value: "2026-10-13",
				expected: "2026-10-13",
			},
			{
				label: "Appointment time",
				testId: "timeInput",
				value: "14:30",
				expected: "14:30",
			},
			{
				label: "Quantity",
				testId: "numberInput",
				value: "42",
				expected: "42",
			},
			{
				label: "Favorite color",
				testId: "colorInput",
				value: "#FF8800",
				expected: "#ff8800",
			},
			{
				label: "Volume",
				testId: "rangeInput",
				value: "35",
				expected: "35",
			},
		] as const) {
			test(`fills ${label}`, async ({ testAppPage, mcpClientPage }) => {
				const { tab, findPath } = await openRichInputTest(
					testAppPage,
					mcpClientPage,
				);
				const path = await findPath("input", label);

				const result = await mcpClientPage.callTool("fillTextToElement", {
					...tab,
					readablePath: path,
					value,
				});

				expect(result.structuredContent?.ok).toBe(true);
				const locators = testAppPage.getRichInputTestLocators();
				await expect(locators[testId]).toHaveValue(expected);
			});
		}

		test("rejects a malformed date with a clear reason", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const path = await findPath("input", "Appointment date");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: path,
				value: "13/10/2026",
			});

			expect(result.structuredContent?.ok).toBe(false);
			expect(result.structuredContent?.reason).toContain("Malformed value");
		});

		test("rejects a range value off the step grid", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const path = await findPath("input", "Volume");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: path,
				value: "33",
			});

			expect(result.structuredContent?.ok).toBe(false);
			expect(result.structuredContent?.reason).toContain(
				'the browser would store "35"',
			);
		});

		test("fills the control associated with a label", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const labelPath = await findPath("label", "Nickname");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: labelPath,
				value: "Ace",
			});

			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getRichInputTestLocators();
			await expect(locators.nicknameInput).toHaveValue("Ace");
		});

		test("accepts a masked input that reformats the value", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const path = await findPath("input", "Phone number");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: path,
				value: "5551234567",
			});

			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getRichInputTestLocators();
			await expect(locators.phoneInput).toHaveValue("(555) 123-4567");
		});

		test("refuses to fill a checkbox", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			const { tab, findPath } = await openRichInputTest(
				testAppPage,
				mcpClientPage,
			);
			const path = await findPath("input", "Accept terms");

			const result = await mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: path,
				value: "yes",
			});

			expect(result.structuredContent?.ok).toBe(false);
			expect(result.structuredContent?.reason).toContain(
				'Input of type "checkbox" cannot be filled',
			);
		});
	});
});
