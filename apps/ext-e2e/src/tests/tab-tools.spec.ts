import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Tab Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("openTab", () => {
		test("opens new tab with specified URL", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const browsers = contextResult.structuredContent?.value?.browsers ?? [];
			const windowKey = browsers[0]?.browserWindows[0]?.windowKey;
			expectToBeDefined(windowKey);

			const newPagePromise = context.waitForEvent("page");
			const openResult = await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/click-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			expect(openResult.structuredContent?.value?.tabKey).toBeDefined();
			expect(openResult.structuredContent?.value?.windowKey).toBe(windowKey);

			const newContextResult = await mcpClientPage.callTool("getContext", {});
			const newTabs =
				newContextResult.structuredContent?.value?.browsers[0]
					?.browserWindows[0]?.tabs ?? [];
			const clickTestTab = newTabs.find((t) => t.url.includes("click-test"));
			expect(clickTestTab).toBeDefined();
		});

		test("returns correct tabKey for new tab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.windowKey;
			expectToBeDefined(windowKey);

			const newPagePromise = context.waitForEvent("page");
			await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/form-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				newPage,
				"form-test",
			);
			const text = await mcpClientPage.readResourceText(
				`${tabUri}/readable-text`,
			);
			expect(text).toContain("Form Test");
		});
	});

	test.describe("closeTab", () => {
		test("closes specified tab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.windowKey;
			expectToBeDefined(windowKey);

			const newPagePromise = context.waitForEvent("page");
			const openResult = await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/text-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");
			const newTabKey = openResult.structuredContent?.value?.tabKey;
			expectToBeDefined(newTabKey);

			const beforeClose = await mcpClientPage.callTool("getContext", {});
			const tabsBeforeClose =
				beforeClose.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.tabs ?? [];
			const textTestTabBefore = tabsBeforeClose.find((t) =>
				t.url.includes("text-test"),
			);
			expect(textTestTabBefore).toBeDefined();

			await mcpClientPage.callTool("closeTab", {
				tabKey: newTabKey,
			});

			const afterClose = await mcpClientPage.callTool("getContext", {});
			const tabsAfterClose =
				afterClose.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.tabs ?? [];
			const textTestTabAfter = tabsAfterClose.find((t) =>
				t.url.includes("text-test"),
			);
			expect(textTestTabAfter).toBeUndefined();
		});
	});

	test.describe("captureTab", () => {
		test.skip(({ extTarget }) => extTarget === "m3");
		test("captures screenshot of tab", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const tabKey =
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]?.tabs.find(
					(t) => t.url.includes("click-test"),
				)?.tabKey;
			expectToBeDefined(tabKey);

			const captureResult = await mcpClientPage.callTool("captureTab", {
				tabKey,
			});
			const screenshot = captureResult.structuredContent?.value;

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
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]?.tabs.find(
					(t) => t.url.includes("localhost"),
				)?.tabKey;
			expectToBeDefined(tabKey);

			const captureResult = await mcpClientPage.callTool("captureTab", {
				tabKey,
			});
			const screenshot = captureResult.structuredContent?.value;

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
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]?.tabs.find(
					(t) => t.url.includes("javascript-test"),
				)?.tabKey;
			expectToBeDefined(tabKey);

			const captureResult = await mcpClientPage.callTool("captureTab", {
				tabKey,
			});
			const screenshot = captureResult.structuredContent?.value;

			expectToBeDefined(screenshot?.data);
			const base64Regex = /^[A-Za-z0-9+/]+=*$/;
			expect(base64Regex.test(screenshot.data)).toBe(true);
		});
	});

	test.describe("Tab workflow", () => {
		test("opens multiple tabs and switches between them", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				contextResult.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.windowKey;
			expectToBeDefined(windowKey);

			const newPage1Promise = context.waitForEvent("page");
			const tab1Result = await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/click-test",
			});
			const newPage1 = await newPage1Promise;
			await newPage1.waitForLoadState("load");
			const tab1Key = tab1Result.structuredContent?.value?.tabKey;

			const newPage2Promise = context.waitForEvent("page");
			const tab2Result = await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/form-test",
			});
			const newPage2 = await newPage2Promise;
			await newPage2.waitForLoadState("load");
			const tab2Key = tab2Result.structuredContent?.value?.tabKey;

			expectToBeDefined(tab1Key);
			expectToBeDefined(tab2Key);

			const tabUri1 = await mcpClientPage.waitForTabUriByUrl(
				newPage1,
				"click-test",
			);
			const text1 = await mcpClientPage.readResourceText(
				`${tabUri1}/readable-text`,
			);
			expect(text1).toContain("Click Test");

			const tabUri2 = await mcpClientPage.waitForTabUriByUrl(
				newPage2,
				"form-test",
			);
			const text2 = await mcpClientPage.readResourceText(
				`${tabUri2}/readable-text`,
			);
			expect(text2).toContain("Form Test");

			await mcpClientPage.callTool("closeTab", {
				tabKey: tab1Key,
			});
			await mcpClientPage.callTool("closeTab", {
				tabKey: tab2Key,
			});

			const finalContext = await mcpClientPage.callTool("getContext", {});
			const finalTabs =
				finalContext.structuredContent?.value?.browsers[0]?.browserWindows[0]
					?.tabs ?? [];
			const clickTestTab = finalTabs.find((t) => t.url.includes("click-test"));
			const formTestTab = finalTabs.find((t) => t.url.includes("form-test"));

			expect(clickTestTab).toBeUndefined();
			expect(formTestTab).toBeUndefined();
		});
	});
});
