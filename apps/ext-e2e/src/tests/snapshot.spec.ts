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
			expect(page1.totalPages).toBe(2); // 13k chars / 8192 page size = 2 pages
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			expect(typeof page1.data).toBe("string");
			expect(page1.data.length).toBeLessThanOrEqual(8192);
			expect(page1.data).toContain("This is paragraph number 1.");

			// 2. Fetch Page 2 from cache (last page)
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/2`,
			);
			const page2 = jsonPage2 as SnapshotResultJson<string>;

			expectToBeDefined(page2);
			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(2);
			expect(page2.hasNextPage).toBe(false);
			expect(page2.nextPageNumber).toBeNull();
			expect(typeof page2.data).toBe("string");
			expect(page2.data).toContain("This is paragraph number 25.");
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

			const assertPageCharLimit = (data: unknown[]) => {
				expect(Array.isArray(data)).toBe(true);
				expect(data.length).toBeGreaterThanOrEqual(1);
				const serializedLength = data
					.map((item) => JSON.stringify(item).length)
					.reduce((a, b) => a + b, 0);
				if (data.length > 1) {
					expect(serializedLength).toBeLessThanOrEqual(8192);
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
			expect(page1.totalPages).toBeGreaterThanOrEqual(2);
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			assertPageCharLimit(page1.data);

			// 2. Fetch Page 2 from cache
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-elements/snapshots/${page1.snapshotId}/pages/2`,
			);
			const page2 = jsonPage2 as SnapshotResultJson<unknown[]>;

			expectToBeDefined(page2);
			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(page1.totalPages);
			assertPageCharLimit(page2.data);

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
			assertPageCharLimit(pageLast.data);
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

			// 2. Access out of range page (Page 3 when only 2 exist)
			await expect(
				mcpClientPage.readResource(
					`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/3`,
				),
			).rejects.toThrow(/Page 3 out of range/);

			// 3. Try reading Page 2 with a fake snapshot ID (cache should not have it)
			await expect(
				mcpClientPage.readResource(
					"bk:///snapshot-types/readable-text/snapshots/snapshot-fake/pages/2",
				),
			).rejects.toThrow(
				/No cached snapshot pages found for snapshot ID: snapshot-fake/,
			);
		});

		test("should keep snapshot readable after navigation (idempotent pagination)", async ({
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

			// 2. Navigate away and back to change the tab fingerprint
			await testAppPage.navigateToHome();
			await testAppPage.navigateToSnapshotTest();

			// 3. The old snapshot should still be readable by snapshotId
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`bk:///snapshot-types/readable-text/snapshots/${page1.snapshotId}/pages/2`,
			);
			const page2 = jsonPage2 as SnapshotResultJson<string>;

			expect(page2).toBeDefined();
			expect(page2.snapshotId).toBe(page1.snapshotId);
			expect(page2.pageNumber).toBe(2);

			// 4. Reading page 1 again via the tab URI should produce a fresh snapshot
			const { json: jsonFresh } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);
			const fresh = jsonFresh as SnapshotResultJson<string>;
			expect(fresh.snapshotId).not.toBe(page1.snapshotId);
		});
	});
});
