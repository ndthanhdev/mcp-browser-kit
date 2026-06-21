import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

type SnapshotResultJson<T> = {
	snapshotId: string;
	pageNumber: number;
	nextPageNumber: number | null;
	hasNextPage: boolean;
	totalPages: number;
	data: T;
};

type ContextJson = {
	browsers: Array<{
		browserId: string;
		status: string;
		browserInfo: unknown;
		extensionInfo: {
			extensionId: string;
			manifestVersion: number;
		};
		windows: Array<{
			id: string;
			focused: boolean;
		}>;
		tabs: Array<{
			id: string;
			windowId: string;
			url: string;
			title: string;
			active: boolean;
			tabUri: string;
		}>;
	}>;
};

test.describe("Resource Fallback Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("tools/list", () => {
		test("all fallback tools are listed with readOnlyHint", async ({
			mcpClientPage,
		}) => {
			const tools = await mcpClientPage.listTools();
			const fallbackToolNames = [
				"getContext",
				"getReadableText",
				"getReadableElements",
				"getSnapshotPage",
			];

			for (const name of fallbackToolNames) {
				const tool = tools.find((t) => t.name === name);
				expectToBeDefined(tool);
				expect(tool.annotations?.readOnlyHint).toBe(true);
			}
		});
	});

	test.describe("getContext", () => {
		test("returns browser list with tabs", async ({ mcpClientPage }) => {
			const context =
				await mcpClientPage.callToolJson<ContextJson>("getContext");

			expect(context.browsers.length).toBeGreaterThan(0);
			const browser = context.browsers[0];
			expect(typeof browser.browserId).toBe("string");
			expectToBeDefined(browser.extensionInfo);
			expect(typeof browser.extensionInfo.extensionId).toBe("string");
			expect(browser.tabs.length).toBeGreaterThan(0);

			const tab = browser.tabs[0];
			expect(typeof tab.id).toBe("string");
			expect(typeof tab.windowId).toBe("string");
			expect(typeof tab.tabUri).toBe("string");
			expect(typeof tab.url).toBe("string");
			expect(typeof tab.title).toBe("string");
		});

		test("context shape matches resource", async ({ mcpClientPage }) => {
			const toolContext =
				await mcpClientPage.callToolJson<ContextJson>("getContext");
			const { json: resourceContext } =
				await mcpClientPage.readResource("bk:///context");
			const resCtx = resourceContext as ContextJson;

			expect(toolContext.browsers.length).toBe(resCtx.browsers.length);

			for (let i = 0; i < toolContext.browsers.length; i++) {
				const toolBrowser = toolContext.browsers[i];
				const resBrowser = resCtx.browsers[i];

				expect(toolBrowser.browserId).toBe(resBrowser.browserId);
				expect(toolBrowser.tabs.length).toBe(resBrowser.tabs.length);

				for (let j = 0; j < toolBrowser.tabs.length; j++) {
					expect(toolBrowser.tabs[j].id).toBe(resBrowser.tabs[j].id);
					expect(toolBrowser.tabs[j].url).toBe(resBrowser.tabs[j].url);
				}
			}
		});
	});

	test.describe("getReadableText", () => {
		test("returns readable text for a tab", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"text-test",
			);

			const result = await mcpClientPage.callToolJson<
				SnapshotResultJson<string>
			>("getReadableText", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			expect(typeof result.snapshotId).toBe("string");
			expect(result.pageNumber).toBe(1);
			expect(result.totalPages).toBeGreaterThanOrEqual(1);
			expect(typeof result.data).toBe("string");
			expect(result.data).toContain("Text Test Screen");
		});

		test("pagination with getSnapshotPage", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			const page1 = await mcpClientPage.callToolJson<
				SnapshotResultJson<string>
			>("getReadableText", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			expect(page1.data.length).toBeLessThanOrEqual(8192);
			expect(page1.data).toContain("This is paragraph number 1.");

			const page2 = await mcpClientPage.callToolJson<
				SnapshotResultJson<string>
			>("getSnapshotPage", {
				snapshotId: page1.snapshotId,
				type: "readable-text",
				pageNumber: 2,
			});

			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.hasNextPage).toBe(false);
			expect(page2.data).toContain("This is paragraph number 25.");
		});

		test("returns error for invalid browserId", async ({ mcpClientPage }) => {
			const result = await mcpClientPage.callToolJson<{
				ok: boolean;
				reason: string;
			}>("getReadableText", {
				browserId: "invalid-browser-xyz",
				tabId: "0",
			});

			expect(result.ok).toBe(false);
			expect(typeof result.reason).toBe("string");
		});
	});

	test.describe("getReadableElements", () => {
		test("returns element tuples for a tab", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"text-test",
			);

			const result = await mcpClientPage.callToolJson<
				SnapshotResultJson<
					[
						string,
						string,
						string,
					][]
				>
			>("getReadableElements", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			expect(typeof result.snapshotId).toBe("string");
			expect(result.pageNumber).toBe(1);
			expect(Array.isArray(result.data)).toBe(true);
			expect(result.data.length).toBeGreaterThan(0);

			const tuple = result.data[0];
			expect(Array.isArray(tuple)).toBe(true);
			expect(tuple.length).toBe(3);
			expect(typeof tuple[0]).toBe("string");
			expect(typeof tuple[1]).toBe("string");
			expect(typeof tuple[2]).toBe("string");
		});

		test("element paths work with interaction tools", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElementsViaTool(tab);

			const primaryButtonPath = elements.find(
				(el) => el[1] === "button" && el[2]?.includes("Primary"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			const clickResult = await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: primaryButtonPath,
			});

			expect(clickResult.structuredContent?.ok).toBe(true);

			const locators = testAppPage.getClickTestLocators();
			await expect(locators.clickCount).toContainText("1");
		});

		test("matches resource output", async ({ testAppPage, mcpClientPage }) => {
			await testAppPage.navigateToTextTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"text-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);

			const toolResult = await mcpClientPage.callToolJson<
				SnapshotResultJson<
					[
						string,
						string,
						string,
					][]
				>
			>("getReadableElements", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			const resourceText = await mcpClientPage.readResourceText(
				`${tabUri}/readable-elements`,
			);
			const resourceResult = JSON.parse(resourceText) as SnapshotResultJson<
				[
					string,
					string,
					string,
				][]
			>;

			expect(toolResult.totalPages).toBe(resourceResult.totalPages);
			expect(toolResult.data.length).toBe(resourceResult.data.length);

			for (let i = 0; i < toolResult.data.length; i++) {
				expect(toolResult.data[i][0]).toBe(resourceResult.data[i][0]);
				expect(toolResult.data[i][1]).toBe(resourceResult.data[i][1]);
				expect(toolResult.data[i][2]).toBe(resourceResult.data[i][2]);
			}
		});
	});

	test.describe("getSnapshotPage", () => {
		test("fetches continuation page", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			const page1 = await mcpClientPage.callToolJson<
				SnapshotResultJson<
					[
						string,
						string,
						string,
					][]
				>
			>("getReadableElements", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			expect(page1.hasNextPage).toBe(true);
			expectToBeDefined(page1.nextPageNumber);

			const page2 = await mcpClientPage.callToolJson<
				SnapshotResultJson<
					[
						string,
						string,
						string,
					][]
				>
			>("getSnapshotPage", {
				snapshotId: page1.snapshotId,
				type: "readable-elements",
				pageNumber: page1.nextPageNumber,
			});

			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(page1.nextPageNumber);
			expect(Array.isArray(page2.data)).toBe(true);
			expect(page2.data.length).toBeGreaterThan(0);
		});

		test("errors on fake snapshotId", async ({ mcpClientPage }) => {
			const result = await mcpClientPage.callToolJson<{
				ok: boolean;
				reason: string;
			}>("getSnapshotPage", {
				snapshotId: "snapshot-does-not-exist",
				type: "readable-text",
				pageNumber: 1,
			});

			expect(result.ok).toBe(false);
			expect(result.reason).toContain("No cached snapshot");
		});

		test("errors on out-of-range page", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			const page1 = await mcpClientPage.callToolJson<
				SnapshotResultJson<string>
			>("getReadableText", {
				browserId: tab.browserId,
				tabId: tab.tabId,
			});

			const result = await mcpClientPage.callToolJson<{
				ok: boolean;
				reason: string;
			}>("getSnapshotPage", {
				snapshotId: page1.snapshotId,
				type: "readable-text",
				pageNumber: 99,
			});

			expect(result.ok).toBe(false);
			expect(result.reason).toContain("out of range");
		});
	});
});
