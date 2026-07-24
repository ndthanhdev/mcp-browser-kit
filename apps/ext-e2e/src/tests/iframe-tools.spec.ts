import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Iframe Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("baseline sanity", () => {
		test("clickOnElement on a non-iframe element still works while an iframe is present", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTest();

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
		test("includes content inside the iframe", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);

			// Content scripts now run in every frame (all_frames: true) and the
			// background aggregates each frame's tree via mergeFrameTabContexts,
			// so content inside the <iframe> is visible with a frame-qualified path.
			const iframeButtonEntry = elements.find((el) =>
				el[2]?.includes("Iframe Inner Button"),
			);
			expect(iframeButtonEntry).toBeDefined();

			// The outer page's own content should still be visible.
			const outerButtonEntry = elements.find((el) =>
				el[2]?.includes("Outer Button"),
			);
			expect(outerButtonEntry).toBeDefined();
		});
	});

	test.describe("clickOnElement", () => {
		test("clicks a button positioned inside the iframe by readable path", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTest();

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
		test("clicks an element positioned inside the iframe", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTest();

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

			// resolveDeepFrame (driven-browser-driver-base.ts) detects the point
			// lands on the <iframe> via dom.resolveHitTarget, correlates it to
			// the child frameId via the window.name nonce handshake, and
			// re-issues the click against the resolved frame with translated
			// coordinates — so this now succeeds and clicks the inner button.
			expect(result.structuredContent?.ok).toBe(true);
			const locators = testAppPage.getIframeTestLocators();
			await expect(locators.iframeClickCountMirror).toContainText(
				"Iframe Click Count (mirrored): 1",
			);
		});
	});

	test.describe("mutation inside the iframe", () => {
		test("invalidates the tab's snapshot cache", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToIframeTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"iframe-test",
			);
			const readableTextUri = `${tabUri}/readable-text`;

			await mcpClientPage.subscribeResource(readableTextUri);
			mcpClientPage.clearResourceNotifications();

			// A DOM mutation entirely inside the <iframe>'s own document (not the
			// top frame) — this only invalidates the aggregate cache if the
			// subframe's own TabContentMutationObserver instance is running too.
			await testAppPage.page
				.frameLocator('[data-testid="test-iframe"]')
				.getByTestId("iframe-inner-button")
				.click();

			await mcpClientPage.waitForResourceUpdated(readableTextUri);
		});
	});
});
