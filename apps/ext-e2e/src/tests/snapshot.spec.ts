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

test.describe("Browser Snapshot E2E Tests", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(45000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("Text and Element Snapshot", () => {
		test("should successfully snapshot readable text across multiple pages", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			// 1. Fetch Page 1 (readable-text)
			const { json: jsonPage1 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);
			const page1 = jsonPage1 as SnapshotResultJson<string>;

			expectToBeDefined(page1);
			expect(typeof page1.snapshotId).toBe("string");
			expect(page1.pageNumber).toBe(1);
			expect(page1.totalPages).toBe(3); // 13k chars / 5k page size = 3 pages
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			expect(typeof page1.data).toBe("string");
			expect(page1.data).toContain("This is paragraph number 1.");

			// 2. Fetch Page 2 from cache
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/2`,
			);
			const page2 = jsonPage2 as SnapshotResultJson<string>;

			expectToBeDefined(page2);
			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(3);
			expect(page2.hasNextPage).toBe(true);
			expect(page2.nextPageNumber).toBe(3);
			expect(typeof page2.data).toBe("string");
			expect(page2.data).toContain("This is paragraph number 11.");

			// 3. Fetch Page 3 from cache (last page)
			const { json: jsonPage3 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/3`,
			);
			const page3 = jsonPage3 as SnapshotResultJson<string>;

			expectToBeDefined(page3);
			expect(page3.snapshotId).toBe(page1.snapshotId);
			expect(page3.pageNumber).toBe(3);
			expect(page3.totalPages).toBe(3);
			expect(page3.hasNextPage).toBe(false);
			expect(page3.nextPageNumber).toBeNull();
			expect(typeof page3.data).toBe("string");
			expect(page3.data).toContain("This is paragraph number 25.");
		});

		test("should successfully snapshot interactive elements across multiple pages using token length constraints", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			// Helper to check token length constraints on page data
			const assertPageConstraints = (data: unknown[]) => {
				expect(Array.isArray(data)).toBe(true);
				expect(data.length).toBeGreaterThanOrEqual(1); // Minimum 1 element per page
				const serializedLength = data
					.map((item) => JSON.stringify(item).length)
					.reduce((a, b) => a + b, 0);
				if (data.length > 1) {
					expect(serializedLength).toBeLessThanOrEqual(100); // Max token length constraint (READABLE_ELEMENTS_PAGE_SIZE = 100)
				}
			};

			// 1. Fetch Page 1 (readable-elements)
			const { json: jsonPage1 } = await mcpClientPage.readResource(
				`${tabUri}/readable-elements`,
			);
			const page1 = jsonPage1 as SnapshotResultJson<unknown[]>;

			expectToBeDefined(page1);
			expect(typeof page1.snapshotId).toBe("string");
			expect(page1.pageNumber).toBe(1);
			expect(page1.totalPages).toBeGreaterThanOrEqual(100); // 249 elements split by 100 chars max will yield > 100 pages
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			assertPageConstraints(page1.data);

			// 2. Fetch Page 2 from cache
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-elements/snapshots/${page1.snapshotId}/pages/2`,
			);
			const page2 = jsonPage2 as SnapshotResultJson<unknown[]>;

			expectToBeDefined(page2);
			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(page1.totalPages);
			expect(page2.hasNextPage).toBe(true);
			expect(page2.nextPageNumber).toBe(3);
			assertPageConstraints(page2.data);

			// 3. Fetch Last Page from cache
			const lastPageNumber = page1.totalPages;
			const { json: jsonPageLast } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-elements/snapshots/${page1.snapshotId}/pages/${lastPageNumber}`,
			);
			const pageLast = jsonPageLast as SnapshotResultJson<unknown[]>;

			expectToBeDefined(pageLast);
			expect(pageLast.snapshotId).toBe(page1.snapshotId);
			expect(pageLast.pageNumber).toBe(lastPageNumber);
			expect(pageLast.totalPages).toBe(lastPageNumber);
			expect(pageLast.hasNextPage).toBe(false);
			expect(pageLast.nextPageNumber).toBeNull();
			assertPageConstraints(pageLast.data);
		});

		test("should throw errors when accessing cache out of bounds or before page 1", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			// 1. Fetch Page 1 first to populate cache
			const { json: jsonPage1 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);
			const page1 = jsonPage1 as SnapshotResultJson<string>;

			// 2. Access out of range page (Page 4 when only 3 exist)
			await expect(
				mcpClientPage.readResource(
					`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/4`,
				),
			).rejects.toThrow(/Page 4 out of range/);

			// 3. Try reading Page 2 with a fake snapshot ID (cache should not have it)
			await expect(
				mcpClientPage.readResource(
					"bk:///snapshot-types/readable-text/snapshots/snapshot-fake/pages/2",
				),
			).rejects.toThrow(
				/No cached snapshot pages found for snapshot ID: snapshot-fake/,
			);
		});

		test("should invalidate cache when the page is reloaded or navigated", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToSnapshotTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"snapshot-test",
			);

			// 1. Read Page 1 to populate cache
			const { json: jsonPage1 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);
			const page1 = jsonPage1 as SnapshotResultJson<string>;

			// 2. Verify Page 2 reads successfully
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/2`,
			);
			expect(jsonPage2).toBeDefined();

			// 3. Navigate away and back to change the tab fingerprint, triggering cache invalidation
			await testAppPage.navigateToHome();
			await testAppPage.navigateToSnapshotTest();

			// 4. Try reading Page 2 directly using the invalidated snapshotId (should fail due to invalidation)
			await expect(
				mcpClientPage.readResource(
					`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/2`,
				),
			).rejects.toThrow(/No cached snapshot pages found for snapshot ID:/);
		});
	});
});
