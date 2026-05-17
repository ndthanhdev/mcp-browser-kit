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
				.filter((u) => u.includes(BK_TAB_INFIX) && !u.includes("/readable-"));
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

		test("reading a readable-text URI returns page inner text", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);

			const text = await mcpClientPage.readResourceText(
				`${tabUri}/readable-text`,
			);

			expect(text).toContain("Text Test Screen");
			expect(text).toContain("Heading Level 1");
			expect(text).toContain("Heading Level 2");
			expect(text).toContain("first paragraph");
		});

		test("reading a readable-elements URI returns element tuples", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToTextTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"text-test",
			);

			const { result } = await mcpClientPage.readResource(
				`${tabUri}/readable-elements`,
			);

			const first = result.contents[0];
			expectToBeDefined(first);
			expect(first.mimeType).toBe("application/json");

			const elements = JSON.parse(
				"text" in first ? String(first.text) : "[]",
			) as unknown[];
			expect(Array.isArray(elements)).toBe(true);
			expect(elements.length).toBeGreaterThan(0);

			const tuple = elements[0] as unknown[];
			expect(Array.isArray(tuple)).toBe(true);
			expect(tuple.length).toBe(3);
			expect(typeof tuple[0]).toBe("string");
			expect(typeof tuple[1]).toBe("string");
			expect(typeof tuple[2]).toBe("string");
		});

		test("readable-text notification fires when tab content changes", async ({
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
