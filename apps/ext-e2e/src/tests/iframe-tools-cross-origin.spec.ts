import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Iframe Tools (cross-origin)", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("baseline sanity", () => {
		test("clickOnElement on a non-iframe element still works while a cross-origin iframe is present", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTestCrossOrigin();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const outerButtonPath = elements.find((el) =>
				el[2]?.includes("Outer Button"),
			)?.[0];
			expectToBeDefined(outerButtonPath);

			await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: outerButtonPath,
			});

			const locators = testAppPage.getIframeTestLocators();
			await expect(locators.outerClickCount).toContainText(
				"Outer Click Count: 1",
			);
		});
	});

	test.describe("getReadableElements", () => {
		test("includes content inside the cross-origin iframe", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTestCrossOrigin();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);

			// The content script runs in the cross-origin iframe frame too
			// (all_frames: true has no same-origin restriction), and the
			// background aggregates its tree via frame-qualified paths, so its
			// content is visible even though the iframe is a different origin
			// (127.0.0.1:3001) than the top frame (localhost:3000).
			const iframeButtonEntry = elements.find((el) =>
				el[2]?.includes("Iframe Inner Button"),
			);
			expect(iframeButtonEntry).toBeDefined();

			const outerButtonEntry = elements.find((el) =>
				el[2]?.includes("Outer Button"),
			);
			expect(outerButtonEntry).toBeDefined();
		});
	});

	test.describe("clickOnElement", () => {
		test("clicks a button positioned inside the cross-origin iframe by readable path", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTestCrossOrigin();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const iframeButtonPath = elements.find((el) =>
				el[2]?.includes("Iframe Inner Button"),
			)?.[0];
			expectToBeDefined(iframeButtonPath);

			await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: iframeButtonPath,
			});

			const locators = testAppPage.getIframeTestLocators();
			await expect(locators.iframeClickCountMirror).toContainText(
				"Iframe Click Count (mirrored): 1",
			);
		});
	});

	test.describe("clickOnCoordinates", () => {
		test("clicks an element positioned inside the cross-origin iframe", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTestCrossOrigin();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"iframe-test",
			);

			const innerButtonBox = await testAppPage.page
				.frameLocator('[data-testid="test-iframe"]')
				.getByTestId("iframe-inner-button")
				.boundingBox();
			expectToBeDefined(innerButtonBox);

			const result = await mcpClientPage.callTool("clickOnCoordinates", {
				...tab,
				x: innerButtonBox.x + innerButtonBox.width / 2,
				y: innerButtonBox.y + innerButtonBox.height / 2,
			});

			// window.name is readable across origins by spec, so the nonce
			// correlation handshake in resolveDeepFrame works the same way
			// whether the iframe is same-origin or cross-origin.
			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getIframeTestLocators();
			await expect(locators.iframeClickCountMirror).toContainText(
				"Iframe Click Count (mirrored): 1",
			);
		});
	});
});
