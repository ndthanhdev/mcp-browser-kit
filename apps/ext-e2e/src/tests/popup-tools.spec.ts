import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject } from "../pages/mcp-client-page-object";
import { expectToBeDefined } from "../test-utils/assert-defined";

const BK_BROWSER_PREFIX = "bk:///browsers/";
const BK_TAB_INFIX = "/tabs/";

type BrowserSnapshotJson = {
	snapshot: {
		windows: Array<{
			id: string;
			focused: boolean;
		}>;
		tabs: Array<{
			id?: string;
			url?: string;
			windowId?: string;
		}>;
	};
};

const isBrowserSnapshotJson = (value: unknown): value is BrowserSnapshotJson =>
	typeof value === "object" &&
	value !== null &&
	Array.isArray((value as BrowserSnapshotJson).snapshot?.windows);

async function getFirstBrowserUri(
	mcpClientPage: McpClientPageObject,
): Promise<string> {
	const resources = await mcpClientPage.listResources();
	const browserUri = resources
		.map((r) => r.uri)
		.find((u) => u.startsWith(BK_BROWSER_PREFIX) && !u.includes(BK_TAB_INFIX));
	expectToBeDefined(browserUri);
	return browserUri;
}

test.describe("Popup Window Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("window/tab enumeration", () => {
		test("a popup window opened via window.open is enumerated as an additional window with a linked tab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPopupTest();

			const browserUri = await getFirstBrowserUri(mcpClientPage);
			const { json: beforeJson } = await mcpClientPage.readResource(browserUri);
			expect(isBrowserSnapshotJson(beforeJson)).toBe(true);
			if (!isBrowserSnapshotJson(beforeJson)) return;
			const windowsBefore = beforeJson.snapshot.windows.length;

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");

			await expect(async () => {
				const { json } = await mcpClientPage.readResource(browserUri);
				expect(isBrowserSnapshotJson(json)).toBe(true);
				if (!isBrowserSnapshotJson(json)) return;

				expect(json.snapshot.windows.length).toBeGreaterThan(windowsBefore);

				const popupTab = json.snapshot.tabs.find(
					(t) => typeof t.url === "string" && t.url.includes("iframe-test"),
				);
				expect(popupTab).toBeDefined();
				expect(
					json.snapshot.windows.some((w) => w.id === popupTab?.windowId),
				).toBe(true);
			}).toPass({
				timeout: 10000,
				intervals: [
					500,
				],
			});
		});
	});

	test.describe("openTab / closeTab targeting a popup window", () => {
		test("openTab opens a new tab inside the popup window, and closeTab removes it", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			test.fail(
				true,
				"Empirically, openTab({windowId: <popup window's id>, url}) does " +
					"not land the new tab in that popup window — background-tools-m3.ts " +
					"passes windowId straight through to browser.tabs.create(), but the " +
					"returned tab's windowId does not match the popup's windowId; the " +
					"tab lands in a different (the original) window instead.",
			);

			await testAppPage.navigateToPopupTest();

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");

			const popupTab = await mcpClientPage.waitForTabByUrl(
				popupPage,
				"iframe-test",
			);
			const popupWindowRef = {
				browserId: popupTab.browserId,
				windowId: popupTab.windowId,
			};

			const newPagePromise = context.waitForEvent("page");
			const openResult = await mcpClientPage.callTool("openTab", {
				...popupWindowRef,
				url: "http://localhost:3000/click-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			expect(openResult.structuredContent?.value?.windowId).toBe(
				popupWindowRef.windowId,
			);

			const clickTestTabUri = await mcpClientPage.waitForTabUriByUrl(
				newPage,
				"click-test",
			);
			expect(clickTestTabUri).toBeTruthy();

			const newTab = openResult.structuredContent?.value;
			expectToBeDefined(newTab);
			await mcpClientPage.callTool("closeTab", {
				browserId: newTab.browserId,
				windowId: newTab.windowId,
				tabId: newTab.tabId,
			});

			await expect(async () => {
				const uriAfterClose = await mcpClientPage.findTabUriByUrl("click-test");
				expect(uriAfterClose).toBeNull();
			}).toPass({
				timeout: 5000,
				intervals: [
					500,
				],
			});
		});
	});

	test.describe("interaction targeting while a popup is focused", () => {
		test("clickOnElement still targets the original window's tab while the popup is focused", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPopupTest();
			const originalTab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"popup-test",
			);

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");
			await popupPage.bringToFront();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"popup-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const openerButtonPath = elements.find((el) =>
				el[2]?.includes("Opener Button"),
			)?.[0];
			expectToBeDefined(openerButtonPath);

			await mcpClientPage.callTool("clickOnElement", {
				...originalTab,
				readablePath: openerButtonPath,
			});

			const locators = testAppPage.getPopupTestLocators();
			await expect(locators.openerClickCount).toContainText(
				"Opener Click Count: 1",
			);
		});
	});

	test.describe("captureTab window targeting when a popup is focused", () => {
		test.skip(({ extTarget }) => extTarget === "m3");

		test("captureTab for the original window should not return the focused popup's content", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			test.fail(
				true,
				"captureTab (background-tools-m2.ts) ignores its tabId/windowId " +
					"argument and always calls browser.tabs.captureVisibleTab() with " +
					"no window argument, so it captures whichever window is " +
					"OS-focused rather than the window that was requested.",
			);

			await testAppPage.navigateToPopupTest();
			const originalTab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"popup-test",
			);
			const originalViewport = await testAppPage.page.evaluate(() => ({
				width: window.innerWidth,
				height: window.innerHeight,
			}));

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");
			await popupPage.bringToFront();
			const popupViewport = await popupPage.evaluate(() => ({
				width: window.innerWidth,
				height: window.innerHeight,
			}));

			const captureResult = await mcpClientPage.callTool("captureTab", {
				...originalTab,
			});
			const screenshot = captureResult.structuredContent?.value;
			expectToBeDefined(screenshot);

			expect(Math.abs(screenshot.width - originalViewport.width)).toBeLessThan(
				50,
			);
			expect(Math.abs(screenshot.width - popupViewport.width)).toBeGreaterThan(
				50,
			);
		});
	});

	test.describe("iframe content inside a popup window", () => {
		test("getReadableElements on the popup's tab includes content inside its iframe", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPopupTest();

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");

			const popupTabUri = await mcpClientPage.waitForTabUriByUrl(
				popupPage,
				"iframe-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(popupTabUri);

			const iframeButtonEntry = elements.find((el) =>
				el[2]?.includes("Iframe Inner Button"),
			);
			expect(iframeButtonEntry).toBeDefined();

			const outerButtonEntry = elements.find((el) =>
				el[2]?.includes("Outer Button"),
			);
			expect(outerButtonEntry).toBeDefined();
		});

		test("clickOnCoordinates targeting an iframe element inside the popup window", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPopupTest();

			const popupPagePromise = context.waitForEvent("page");
			await testAppPage.getPopupTestLocators().openPopupButton.click();
			const popupPage = await popupPagePromise;
			await popupPage.waitForLoadState("networkidle");

			test.fail(
				true,
				"The frame correlation handshake (postMessage from the popup's " +
					"top frame to its iframe, forwarded to the background via " +
					"FrameCorrelationResponder) reliably times out specifically " +
					"when the tab lives inside a window.open() popup window, even " +
					"with the popup brought to front — the identical mechanism " +
					"works for a normal tab and for a cross-origin iframe in a " +
					"normal tab (see iframe-tools.spec.ts / " +
					"iframe-tools-cross-origin.spec.ts). Root cause not fully " +
					"diagnosed; consistent with other popup-window-specific " +
					"quirks already known in this codebase (openTab windowId " +
					"targeting, captureTab window targeting).",
			);

			const popupTab = await mcpClientPage.waitForTabByUrl(
				popupPage,
				"iframe-test",
			);

			await popupPage.bringToFront();

			const innerButtonBox = await popupPage
				.frameLocator('[data-testid="test-iframe"]')
				.getByTestId("iframe-inner-button")
				.boundingBox();
			expectToBeDefined(innerButtonBox);

			const result = await mcpClientPage.callTool("clickOnCoordinates", {
				...popupTab,
				x: innerButtonBox.x + innerButtonBox.width / 2,
				y: innerButtonBox.y + innerButtonBox.height / 2,
			});

			expect(result.structuredContent?.ok).toBe(true);
			const iframeClickCountMirror = popupPage.getByTestId(
				"iframe-click-count-mirror",
			);
			await expect(iframeClickCountMirror).toContainText(
				"Iframe Click Count (mirrored): 1",
			);
		});
	});
});
