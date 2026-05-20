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

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"fallback-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"fallback-test",
			);

			const elements = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as [
				string,
				string,
				string,
			][];

			const resistantButtonPath = elements.find((el) =>
				el[2]?.includes("Resistant Button"),
			)?.[0];
			expectToBeDefined(resistantButtonPath);

			const result = await mcpClientPage.callTool("clickOnElement", {
				tabKey,
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

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"fallback-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"fallback-test",
			);

			const elements = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as [
				string,
				string,
				string,
			][];

			const standardButtonPath = elements.find((el) =>
				el[2]?.includes("Standard Button"),
			)?.[0];
			expectToBeDefined(standardButtonPath);

			const result = await mcpClientPage.callTool("clickOnElement", {
				tabKey,
				readablePath: standardButtonPath,
			});

			expect(result.structuredContent?.ok).toBe(true);

			const locators = testAppPage.getFallbackTestLocators();
			await expect(locators.standardClickCount).toContainText(
				"Standard Click Count: 1",
			);
		});
	});

	test.describe("clickOnElement — invalid tabKey", () => {
		test("returns ok: false when the tabKey is not found", async ({
			mcpClientPage,
		}) => {
			const result = await mcpClientPage.callTool("clickOnElement", {
				tabKey: "invalid-tab-key-xyz",
				readablePath: "some/path",
			});

			expect(result.structuredContent?.ok).toBe(false);
			expect(result.structuredContent?.reason).toBeDefined();
		});
	});
});
