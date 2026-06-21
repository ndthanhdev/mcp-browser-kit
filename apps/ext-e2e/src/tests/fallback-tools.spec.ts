import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Fallback Strategy Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("clickOnElement — resistant button (mousedown-only)", () => {
		test("succeeds via mouse-event-chain fallback when element.click() has no effect", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFallbackTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"fallback-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"fallback-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);

			const resistantButtonPath = elements.find(
				(el) => el[1] === "button" && el[2]?.includes("Resistant Button"),
			)?.[0];
			expectToBeDefined(resistantButtonPath);

			const result = await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: resistantButtonPath,
			});

			expect(result.structuredContent?.ok).toBe(true);

			const locators = testAppPage.getFallbackTestLocators();
			await expect(locators.mousedownCount).toContainText("Mousedown Count: 1");
		});
	});

	test.describe("clickOnElement — standard button (baseline)", () => {
		test("succeeds via primary element-click strategy", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFallbackTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"fallback-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"fallback-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);

			const standardButtonPath = elements.find(
				(el) => el[1] === "button" && el[2]?.includes("Standard Button"),
			)?.[0];
			expectToBeDefined(standardButtonPath);

			const result = await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: standardButtonPath,
			});

			expect(result.structuredContent?.ok).toBe(true);

			const locators = testAppPage.getFallbackTestLocators();
			await expect(locators.standardClickCount).toContainText(
				"Standard Click Count: 1",
			);
		});
	});

	test.describe("clickOnElement — invalid browserId", () => {
		test("returns ok: false when the browser is not found", async ({
			mcpClientPage,
		}) => {
			const result = await mcpClientPage.callTool("clickOnElement", {
				browserId: "invalid-browser-xyz",
				windowId: "0",
				tabId: "0",
				readablePath: "some/path",
			});

			expect(result.structuredContent?.ok).toBe(false);
			expect(result.structuredContent?.reason).toBeDefined();
		});
	});
});
