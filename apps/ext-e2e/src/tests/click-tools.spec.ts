import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Click Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("clickOnElement", () => {
		test("clicks on button by readable path", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const contextResult = await mcpClientPage.callTool("getContext", {});
			const browsers = contextResult.structuredContent?.browsers ?? [];
			const tabKey = browsers[0]?.browserWindows[0]?.tabs.find((t) =>
				t.url.includes("click-test"),
			)?.tabKey;
			expectToBeDefined(tabKey);

			const elementsResult = await mcpClientPage.callTool(
				"getReadableElements",
				{
					tabKey,
				},
			);
			const elements = elementsResult.structuredContent?.elements ?? [];
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			await mcpClientPage.callTool("clickOnElement", {
				tabKey,
				readablePath: primaryButtonPath,
			});

			const locators = testAppPage.getClickTestLocators();
			await expect(locators.clickCount).toContainText("Click Count: 1");
			await expect(locators.lastClicked).toContainText("primary-button");
		});

		test("clicks on nested button element", async ({
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

			const elementsResult = await mcpClientPage.callTool(
				"getReadableElements",
				{
					tabKey,
				},
			);
			const nestedButtonPath = (
				elementsResult.structuredContent?.elements ?? []
			).find((el) => el[2]?.includes("Nested Button"))?.[0];
			expectToBeDefined(nestedButtonPath);

			await mcpClientPage.callTool("clickOnElement", {
				tabKey,
				readablePath: nestedButtonPath,
			});

			const locators = testAppPage.getClickTestLocators();
			await expect(locators.lastClicked).toContainText("nested-button");
		});
	});

	test.describe("clickOnCoordinates", () => {
		test("clicks on button at specific coordinates", async ({
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

			const locators = testAppPage.getClickTestLocators();
			const buttonBox = await locators.secondaryButton.boundingBox();
			expectToBeDefined(buttonBox);

			const centerX = buttonBox.x + buttonBox.width / 2;
			const centerY = buttonBox.y + buttonBox.height / 2;

			await mcpClientPage.callTool("clickOnCoordinates", {
				tabKey,
				x: centerX,
				y: centerY,
			});

			await expect(locators.lastClicked).toContainText("secondary-button");
		});

		test("clicks on positioned button using coordinates", async ({
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

			const locators = testAppPage.getClickTestLocators();
			const centerButtonBox = await locators.centerButton.boundingBox();
			expectToBeDefined(centerButtonBox);

			await mcpClientPage.callTool("clickOnCoordinates", {
				tabKey,
				x: centerButtonBox.x + centerButtonBox.width / 2,
				y: centerButtonBox.y + centerButtonBox.height / 2,
			});

			await expect(locators.lastClicked).toContainText("center-button");
		});
	});
});
