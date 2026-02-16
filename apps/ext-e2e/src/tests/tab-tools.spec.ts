import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe
	.skip("Tab Tools", () => {
		test.beforeEach(async ({ mcpClientPage }) => {
			test.setTimeout(30000);
			await mcpClientPage.startServer();
			await mcpClientPage.connect();
			await mcpClientPage.waitForBrowsers();
		});

		test.describe("getContext", () => {
			test("returns browser context with tabs", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const context = contextResult.structuredContent;

				expect(context).toBeDefined();
				expect(context?.browsers).toBeDefined();
				expect(context?.browsers.length).toBeGreaterThan(0);
			});

			test("context contains browser windows", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const browsers = contextResult.structuredContent?.browsers ?? [];

				expect(browsers[0]?.browserWindows).toBeDefined();
				expect(browsers[0]?.browserWindows.length).toBeGreaterThan(0);
			});

			test("context contains tab information", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const browsers = contextResult.structuredContent?.browsers ?? [];
				const tabs = browsers[0]?.browserWindows[0]?.tabs ?? [];

				const homeTab = tabs.find((t) => t.url.includes("localhost"));
				expect(homeTab).toBeDefined();
				expect(homeTab?.tabKey).toBeDefined();
				expect(homeTab?.title).toBeDefined();
				expect(homeTab?.url).toBeDefined();
			});

			test("context includes available tools", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const browsers = contextResult.structuredContent?.browsers ?? [];

				expect(browsers[0]?.availableTools).toBeDefined();
				expect(Array.isArray(browsers[0]?.availableTools)).toBe(true);
			});
		});

		test.describe("openTab", () => {
			test("opens new tab with specified URL", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const browsers = contextResult.structuredContent?.browsers ?? [];
				const windowKey = browsers[0]?.browserWindows[0]?.windowKey;
				expectToBeDefined(windowKey);

				const openResult = await mcpClientPage.callTool("openTab", {
					windowKey,
					url: "http://localhost:5173/click-test",
				});

				expect(openResult.structuredContent?.tabKey).toBeDefined();
				expect(openResult.structuredContent?.windowKey).toBe(windowKey);

				const newContextResult = await mcpClientPage.callTool("getContext", {});
				const newTabs =
					newContextResult.structuredContent?.browsers[0]?.browserWindows[0]
						?.tabs ?? [];
				const clickTestTab = newTabs.find((t) => t.url.includes("click-test"));
				expect(clickTestTab).toBeDefined();
			});

			test("returns correct tabKey for new tab", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const windowKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]
						?.windowKey;
				expectToBeDefined(windowKey);

				const openResult = await mcpClientPage.callTool("openTab", {
					windowKey,
					url: "http://localhost:5173/form-test",
				});

				const newTabKey = openResult.structuredContent?.tabKey;
				expectToBeDefined(newTabKey);

				const textResult = await mcpClientPage.callTool("getReadableText", {
					tabKey: newTabKey,
				});
				expect(textResult.structuredContent).toContain("Form Test");
			});
		});

		test.describe("closeTab", () => {
			test("closes specified tab", async ({ testAppPage, mcpClientPage }) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const windowKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]
						?.windowKey;
				expectToBeDefined(windowKey);

				const openResult = await mcpClientPage.callTool("openTab", {
					windowKey,
					url: "http://localhost:5173/text-test",
				});
				const newTabKey = openResult.structuredContent?.tabKey;
				expectToBeDefined(newTabKey);

				const beforeClose = await mcpClientPage.callTool("getContext", {});
				const tabsBeforeClose =
					beforeClose.structuredContent?.browsers[0]?.browserWindows[0]?.tabs ??
					[];
				const textTestTabBefore = tabsBeforeClose.find((t) =>
					t.url.includes("text-test"),
				);
				expect(textTestTabBefore).toBeDefined();

				await mcpClientPage.callTool("closeTab", {
					tabKey: newTabKey,
				});

				const afterClose = await mcpClientPage.callTool("getContext", {});
				const tabsAfterClose =
					afterClose.structuredContent?.browsers[0]?.browserWindows[0]?.tabs ??
					[];
				const textTestTabAfter = tabsAfterClose.find((t) =>
					t.url.includes("text-test"),
				);
				expect(textTestTabAfter).toBeUndefined();
			});
		});

		test.describe("captureTab", () => {
			test("captures screenshot of tab", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToClickTest();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("click-test"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const captureResult = await mcpClientPage.callTool("captureTab", {
					tabKey,
				});
				const screenshot = captureResult.structuredContent;

				expect(screenshot).toBeDefined();
				expect(screenshot?.width).toBeGreaterThan(0);
				expect(screenshot?.height).toBeGreaterThan(0);
				expect(screenshot?.data).toBeDefined();
				expect(typeof screenshot?.data).toBe("string");
			});

			test("screenshot dimensions are reasonable", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const tabKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]?.tabs.find(
						(t) => t.url.includes("localhost"),
					)?.tabKey;
				expectToBeDefined(tabKey);

				const captureResult = await mcpClientPage.callTool("captureTab", {
					tabKey,
				});
				const screenshot = captureResult.structuredContent;

				expect(screenshot?.width).toBeGreaterThanOrEqual(100);
				expect(screenshot?.height).toBeGreaterThanOrEqual(100);
				expect(screenshot?.width).toBeLessThanOrEqual(5000);
				expect(screenshot?.height).toBeLessThanOrEqual(5000);
			});

			test("screenshot data is base64 encoded", async ({
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

				const captureResult = await mcpClientPage.callTool("captureTab", {
					tabKey,
				});
				const screenshot = captureResult.structuredContent;

				expectToBeDefined(screenshot?.data);
				const base64Regex = /^[A-Za-z0-9+/]+=*$/;
				expect(base64Regex.test(screenshot.data)).toBe(true);
			});
		});

		test.describe("Tab workflow", () => {
			test("opens multiple tabs and switches between them", async ({
				testAppPage,
				mcpClientPage,
			}) => {
				await testAppPage.navigateToHome();

				const contextResult = await mcpClientPage.callTool("getContext", {});
				const windowKey =
					contextResult.structuredContent?.browsers[0]?.browserWindows[0]
						?.windowKey;
				expectToBeDefined(windowKey);

				const tab1Result = await mcpClientPage.callTool("openTab", {
					windowKey,
					url: "http://localhost:5173/click-test",
				});
				const tab1Key = tab1Result.structuredContent?.tabKey;

				const tab2Result = await mcpClientPage.callTool("openTab", {
					windowKey,
					url: "http://localhost:5173/form-test",
				});
				const tab2Key = tab2Result.structuredContent?.tabKey;

				expectToBeDefined(tab1Key);
				expectToBeDefined(tab2Key);

				const text1 = await mcpClientPage.callTool("getReadableText", {
					tabKey: tab1Key,
				});
				expect(text1.structuredContent).toContain("Click Test");

				const text2 = await mcpClientPage.callTool("getReadableText", {
					tabKey: tab2Key,
				});
				expect(text2.structuredContent).toContain("Form Test");

				await mcpClientPage.callTool("closeTab", {
					tabKey: tab1Key,
				});
				await mcpClientPage.callTool("closeTab", {
					tabKey: tab2Key,
				});

				const finalContext = await mcpClientPage.callTool("getContext", {});
				const finalTabs =
					finalContext.structuredContent?.browsers[0]?.browserWindows[0]
						?.tabs ?? [];
				const clickTestTab = finalTabs.find((t) =>
					t.url.includes("click-test"),
				);
				const formTestTab = finalTabs.find((t) => t.url.includes("form-test"));

				expect(clickTestTab).toBeUndefined();
				expect(formTestTab).toBeUndefined();
			});
		});
	});
