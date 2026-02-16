import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe
	.skip("Text Tools", () => {
		test.beforeEach(async ({ mcpClientPage }) => {
			test.setTimeout(30000);
			await mcpClientPage.startServer();
			await mcpClientPage.connect();
			await mcpClientPage.waitForBrowsers();
		});

		test.describe("getReadableText", () => {
			test("extracts all visible text from page", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const textResult = await mcpClientPage.callTool("getReadableText", {
					tabKey,
				});
				const pageText = textResult.structuredContent ?? "";

				expect(pageText).toContain("Text Test Screen");
				expect(pageText).toContain("Heading Level 1");
				expect(pageText).toContain("Heading Level 2");
				expect(pageText).toContain("first paragraph");
				expect(pageText).toContain("bold text");
				expect(pageText).toContain("italic text");
			});

			test("extracts text from lists", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const textResult = await mcpClientPage.callTool("getReadableText", {
					tabKey,
				});
				const pageText = textResult.structuredContent ?? "";

				expect(pageText).toContain("First unordered item");
				expect(pageText).toContain("Second unordered item");
				expect(pageText).toContain("First ordered item");
			});

			test("extracts text from table", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const textResult = await mcpClientPage.callTool("getReadableText", {
					tabKey,
				});
				const pageText = textResult.structuredContent ?? "";

				expect(pageText).toContain("John Doe");
				expect(pageText).toContain("john@example.com");
				expect(pageText).toContain("Admin");
			});
		});

		test.describe("getReadableElements", () => {
			test("returns interactive elements with paths", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const elementsResult = await mcpClientPage.callTool(
					"getReadableElements",
					{
						tabKey,
					},
				);
				const elements = elementsResult.structuredContent?.elements ?? [];

				expect(elements.length).toBeGreaterThan(0);

				const hasPath = elements.every((el) => typeof el[0] === "string");
				const hasRole = elements.every(
					(el) => typeof el[1] === "string" || el[1] === null,
				);
				const hasText = elements.every(
					(el) => typeof el[2] === "string" || el[2] === null,
				);

				expect(hasPath).toBe(true);
				expect(hasRole).toBe(true);
				expect(hasText).toBe(true);
			});

			test("finds buttons with correct text", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const elementsResult = await mcpClientPage.callTool(
					"getReadableElements",
					{
						tabKey,
					},
				);
				const elements = elementsResult.structuredContent?.elements ?? [];

				const actionButton = elements.find((el) =>
					el[2]?.includes("Action Button"),
				);
				const submitButton = elements.find((el) =>
					el[2]?.includes("Submit Button"),
				);
				const resetButton = elements.find((el) =>
					el[2]?.includes("Reset Button"),
				);

				expect(actionButton).toBeDefined();
				expect(submitButton).toBeDefined();
				expect(resetButton).toBeDefined();
			});

			test("finds elements with ARIA labels", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const elementsResult = await mcpClientPage.callTool(
					"getReadableElements",
					{
						tabKey,
					},
				);
				const elements = elementsResult.structuredContent?.elements ?? [];

				const closeButton = elements.find((el) =>
					el[2]?.includes("Close dialog"),
				);
				const addButton = elements.find((el) =>
					el[2]?.includes("Add new item"),
				);
				const deleteButton = elements.find((el) =>
					el[2]?.includes("Delete item"),
				);

				expect(closeButton).toBeDefined();
				expect(addButton).toBeDefined();
				expect(deleteButton).toBeDefined();
			});

			test("finds navigation links", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const elementsResult = await mcpClientPage.callTool(
					"getReadableElements",
					{
						tabKey,
					},
				);
				const elements = elementsResult.structuredContent?.elements ?? [];

				const homeLink = elements.find((el) => el[2] === "Home");
				const aboutLink = elements.find((el) => el[2] === "About");
				const contactLink = elements.find((el) => el[2] === "Contact");

				expect(homeLink).toBeDefined();
				expect(aboutLink).toBeDefined();
				expect(contactLink).toBeDefined();
			});
		});

		test.describe("getSelection", () => {
			test("returns empty selection when nothing selected", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const selectionResult = await mcpClientPage.callTool("getSelection", {
					tabKey,
				});
				const selection = selectionResult.structuredContent;

				expect(selection?.text).toBe("");
			});

			test("returns selected text after programmatic selection", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToTextTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("text-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: `
					const element = document.querySelector('[data-testid="heading-1"]');
					const range = document.createRange();
					range.selectNodeContents(element);
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange(range);
					return selection.toString();
				`,
				});

				const selectionResult = await mcpClientPage.callTool("getSelection", {
					tabKey,
				});
				const selection = selectionResult.structuredContent;

				expect(selection?.text).toContain("Heading Level 1");
			});
		});
	});
