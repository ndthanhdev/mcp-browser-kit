import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject } from "../pages/mcp-client-page-object";
import { expectToBeDefined } from "../test-utils/assert-defined";

const BK_BROWSER_PREFIX = "bk:///browsers/";
const BK_TAB_INFIX = "/tabs/";
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
				.filter((u) => u.includes(BK_TAB_INFIX) && !u.includes("/snapshots/"));
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

		test("reading a browser URI reflects new tabs after navigation", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			const newPage = await context.newPage();
			await newPage.goto("http://localhost:3000/form-test");
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
		test("resources/updated fires for browser URI on new tab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPage = await context.newPage();
			await newPage.goto("http://localhost:3000/click-test");
			await newPage.waitForLoadState("networkidle");

			await mcpClientPage.waitForResourceUpdated(browserUri);
		});

		test("resources/updated fires for browser URI on second new tab", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToHome();

			const browserUri = await getFirstBrowserUri(mcpClientPage);

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPage = await context.newPage();
			await newPage.goto("http://localhost:3000/text-test");
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

			await mcpClientPage.subscribeResource(browserUri);
			mcpClientPage.clearResourceNotifications();

			const newPage = await context.newPage();
			await newPage.goto("http://localhost:3000/javascript-test");
			await newPage.waitForLoadState("networkidle");

			await mcpClientPage.waitForResourceUpdated(browserUri);

			expect(mcpClientPage.getListChangedNotifications().length).toBe(0);
		});
	});

	test.describe("Tab content resources", () => {
		test("resources/list includes readable-text and readable-elements URIs", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			await expect(async () => {
				const resources = await mcpClientPage.listResources();
				const uris = resources.map((r) => r.uri);
				expect(uris.some((u) => u.endsWith("/readable-text"))).toBe(true);
				expect(uris.some((u) => u.endsWith("/readable-elements"))).toBe(true);
			}).toPass({
				timeout: 10000,
				intervals: [
					500,
				],
			});
		});

		test("reading a readable-text page 1 URI returns snapshot page inner text", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);

			const { json } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);

			const snapshotResult = json as {
				snapshotId: string;
				pageNumber: number;
				hasNextPage: boolean;
				totalPages: number;
				data: string;
			};
			expect(typeof snapshotResult.snapshotId).toBe("string");
			expect(snapshotResult.pageNumber).toBe(1);
			expect(snapshotResult.totalPages).toBeGreaterThanOrEqual(1);
			expect(typeof snapshotResult.hasNextPage).toBe("boolean");
			expect(typeof snapshotResult.data).toBe("string");
			expect(snapshotResult.data).toContain("Text Test Screen");
		});

		test("reading a readable-elements page 1 URI returns snapshot element tuples", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);

			const { result, json } = await mcpClientPage.readResource(
				`${tabUri}/readable-elements`,
			);

			const first = result.contents[0];
			expectToBeDefined(first);
			expect(first.mimeType).toBe("application/json");

			const snapshotResult = json as {
				snapshotId: string;
				pageNumber: number;
				hasNextPage: boolean;
				totalPages: number;
				data: unknown[];
			};
			expect(typeof snapshotResult.snapshotId).toBe("string");
			expect(snapshotResult.pageNumber).toBe(1);
			expect(snapshotResult.totalPages).toBeGreaterThanOrEqual(1);
			expect(Array.isArray(snapshotResult.data)).toBe(true);
			expect(snapshotResult.data.length).toBeGreaterThan(0);

			const tuple = snapshotResult.data[0] as unknown[];
			expect(Array.isArray(tuple)).toBe(true);
			expect(tuple.length).toBe(3);
			expect(typeof tuple[0]).toBe("string");
			expect(typeof tuple[1]).toBe("string");
			expect(typeof tuple[2]).toBe("string");
		});

		test("readable-text page 1 notification fires when tab content changes", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);
			const readableTextUri = `${tabUri}/readable-text`;

			await mcpClientPage.subscribeResource(readableTextUri);
			mcpClientPage.clearResourceNotifications();

			await testAppPage.navigateToTextTest();

			await mcpClientPage.waitForResourceUpdated(readableTextUri);
		});
	});
});
