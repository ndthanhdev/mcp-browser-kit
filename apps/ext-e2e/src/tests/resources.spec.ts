import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject } from "../pages/mcp-client-page-object";
import { expectToBeDefined } from "../test-utils/assert-defined";

const BK_BROWSER_PREFIX = "bk:///b-";
const BK_TAB_INFIX = "/t-";
const BK_TEMPLATE = "bk:///{+resourceId}";

type BrowserEntryJson = {
	channelId: string;
	snapshot: {
		status: "online" | "offline";
		tabs: unknown[];
		windows: unknown[];
	};
	lastSeenAt: number;
};

const isEntryJson = (value: unknown): value is BrowserEntryJson =>
	typeof value === "object" &&
	value !== null &&
	typeof (
		value as {
			channelId?: unknown;
		}
	).channelId === "string";

/**
 * Discovers the browser URI for the first connected browser via resources/list.
 */
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

test.describe("Browser-state MCP Resources", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("bk:///{+resourceId} template", () => {
		test("template is discoverable via resources/templates/list", async ({
			mcpClientPage,
		}) => {
			const templates = await mcpClientPage.listResourceTemplates();
			const bkTemplate = templates.find((t) => t.uriTemplate === BK_TEMPLATE);
			expectToBeDefined(bkTemplate);
		});

		test("resources/list includes browser URIs", async ({ mcpClientPage }) => {
			const resources = await mcpClientPage.listResources();
			const browserUris = resources
				.map((r) => r.uri)
				.filter(
					(u) => u.startsWith(BK_BROWSER_PREFIX) && !u.includes(BK_TAB_INFIX),
				);
			expect(browserUris.length).toBeGreaterThan(0);
		});

		test("resources/list includes tab URIs", async ({ mcpClientPage }) => {
			const resources = await mcpClientPage.listResources();
			const tabUris = resources
				.map((r) => r.uri)
				.filter((u) => u.includes(BK_TAB_INFIX));
			expect(tabUris.length).toBeGreaterThan(0);
		});

		test("reading a browser URI returns the matching entry", async ({
			mcpClientPage,
		}) => {
			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const { json } = await mcpClientPage.readResource(browserUri);
			expect(isEntryJson(json)).toBe(true);
			if (!isEntryJson(json)) return;
			expect(json.snapshot.status).toBe("online");
			expect(Array.isArray(json.snapshot.tabs)).toBe(true);
			expect(Array.isArray(json.snapshot.windows)).toBe(true);
		});

		test("reading an unknown resource ID rejects", async ({
			mcpClientPage,
		}) => {
			await expect(
				mcpClientPage.readResource(
					`${BK_BROWSER_PREFIX}doesnotexist${Date.now()}`,
				),
			).rejects.toThrow();
		});

		test("reading a browser URI reflects new tabs after openTab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const ctx = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				ctx.structuredContent?.value?.browsers[0]?.browserWindows[0]?.windowKey;
			expectToBeDefined(windowKey);

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const newPagePromise = context.waitForEvent("page");
			await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/form-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			await expect(async () => {
				const { json } = await mcpClientPage.readResource(browserUri);
				expect(isEntryJson(json)).toBe(true);
				if (!isEntryJson(json)) return;
				const hasFormTab = (
					json.snapshot.tabs as Array<{
						url?: string;
					}>
				).some((t) =>
					typeof t.url === "string" ? t.url.includes("form-test") : false,
				);
				expect(hasFormTab).toBe(true);
			}).toPass({
				timeout: 10000,
				intervals: [
					500,
				],
			});
		});
	});

	test.describe("Notifications", () => {
		test("resources/updated fires for browser URI on tab open", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const ctx = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				ctx.structuredContent?.value?.browsers[0]?.browserWindows[0]?.windowKey;
			expectToBeDefined(windowKey);

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPagePromise = context.waitForEvent("page");
			await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/click-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			await mcpClientPage.waitForResourceUpdated(browserUri);
		});

		test("resources/updated fires for browser URI on tab open (second browser URI)", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const ctx = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				ctx.structuredContent?.value?.browsers[0]?.browserWindows[0]?.windowKey;
			expectToBeDefined(windowKey);

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPagePromise = context.waitForEvent("page");
			await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/text-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			await mcpClientPage.waitForResourceUpdated(browserUri);
		});

		test("snapshot-only updates do NOT emit resources/list_changed", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const ctx = await mcpClientPage.callTool("getContext", {});
			const windowKey =
				ctx.structuredContent?.value?.browsers[0]?.browserWindows[0]?.windowKey;
			expectToBeDefined(windowKey);

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPagePromise = context.waitForEvent("page");
			await mcpClientPage.callTool("openTab", {
				windowKey,
				url: "http://localhost:3000/javascript-test",
			});
			const newPage = await newPagePromise;
			await newPage.waitForLoadState("networkidle");

			// The browser URI should have been updated...
			await mcpClientPage.waitForResourceUpdated(browserUri);

			// ...but no new channel means no list_changed notification.
			expect(mcpClientPage.getListChangedNotifications().length).toBe(0);
		});
	});
});
