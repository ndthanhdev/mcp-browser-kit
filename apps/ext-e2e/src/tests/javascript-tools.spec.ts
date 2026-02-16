import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe
	.skip("JavaScript Tools", () => {
		test.beforeEach(async ({ mcpClientPage }) => {
			test.setTimeout(30000);
			await mcpClientPage.startServer();
			await mcpClientPage.connect();
			await mcpClientPage.waitForBrowsers();
		});

		test.describe("invokeJsFn", () => {
			test("returns document title", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return document.title;",
				});

				expect(result.structuredContent).toContain("JavaScript Test");
			});

			test("returns number value", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return 42;",
				});

				expect(result.structuredContent).toBe(42);
			});

			test("returns boolean value", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return true;",
				});

				expect(result.structuredContent).toBe(true);
			});

			test("returns array value", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return [1, 2, 3];",
				});

				expect(result.structuredContent).toEqual([
					1,
					2,
					3,
				]);
			});

			test("returns object value", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: 'return { name: "test", value: 123 };',
				});

				expect(result.structuredContent).toEqual({
					name: "test",
					value: 123,
				});
			});

			test("returns null value", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return null;",
				});

				expect(result.structuredContent).toBeNull();
			});

			test("calls window.incrementCounter function", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result1 = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return window.incrementCounter();",
				});
				expect(result1.structuredContent).toBe(1);

				const result2 = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return window.incrementCounter();",
				});
				expect(result2.structuredContent).toBe(2);
			});

			test("calls window.addMessage function", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: 'return window.addMessage("Hello from test");',
				});

				expect(result.structuredContent).toEqual([
					"Hello from test",
				]);
			});

			test("calls window.computeSum function", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return window.computeSum(10, 25);",
				});

				expect(result.structuredContent).toBe(35);
			});

			test("reads and modifies DOM element", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: `
					const el = document.getElementById('dynamic-content');
					el.textContent = 'Modified by test';
					return el.textContent;
				`,
				});

				expect(result.structuredContent).toBe("Modified by test");

				const locators = testAppPage.getJavaScriptTestLocators();
				await expect(locators.dynamicContent).toContainText("Modified by test");
			});

			test("reads data attributes", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: `
					const el = document.getElementById('data-element');
					return {
						value: el.dataset.value,
						count: el.dataset.count,
						active: el.dataset.active
					};
				`,
				});

				expect(result.structuredContent).toEqual({
					value: "initial",
					count: "0",
					active: "false",
				});
			});

			test("modifies element styles", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: `
					const el = document.getElementById('style-target');
					el.style.backgroundColor = 'rgb(255, 0, 0)';
					return window.getComputedStyle(el).backgroundColor;
				`,
				});

				const locators = testAppPage.getJavaScriptTestLocators();
				await expect(locators.styleTarget).toHaveCSS(
					"background-color",
					"rgb(255, 0, 0)",
				);
			});

			test("gets window testData object", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToJavaScriptTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("javascript-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const result = await mcpClientPage.callTool("invokeJsFn", {
					tabKey,
					fnBodyCode: "return window.getTestData();",
				});

				expect(result.structuredContent).toEqual({
					counter: 0,
					messages: [],
					lastAction: null,
				});
			});
		});
	});
