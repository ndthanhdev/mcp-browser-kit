import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

type PaginatedResultJson<T> = {
	resultId: string;
	pageNumber: number;
	nextPageNumber: number | null;
	hasNextPage: boolean;
	totalPages: number;
	data: T;
};

test.describe("Browser Pagination E2E Tests", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(45000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("Text and Element Pagination", () => {
		test("should successfully paginate readable text across multiple pages", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPaginationTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"pagination-test",
			);

			// 1. Fetch Page 1 (readable-text)
			const { json: jsonPage1 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text`,
			);
			const page1 = jsonPage1 as PaginatedResultJson<string>;

			expectToBeDefined(page1);
			expect(typeof page1.resultId).toBe("string");
			expect(page1.pageNumber).toBe(1);
			expect(page1.totalPages).toBe(3); // 13k chars / 5k page size = 3 pages
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			expect(typeof page1.data).toBe("string");
			expect(page1.data).toContain("This is paragraph number 1.");

			// 2. Fetch Page 2 from cache
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text/pages/2`,
			);
			const page2 = jsonPage2 as PaginatedResultJson<string>;

			expectToBeDefined(page2);
			expect(page2.resultId).toBe(page1.resultId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(3);
			expect(page2.hasNextPage).toBe(true);
			expect(page2.nextPageNumber).toBe(3);
			expect(typeof page2.data).toBe("string");
			expect(page2.data).toContain("This is paragraph number 11.");

			// 3. Fetch Page 3 from cache (last page)
			const { json: jsonPage3 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text/pages/3`,
			);
			const page3 = jsonPage3 as PaginatedResultJson<string>;

			expectToBeDefined(page3);
			expect(page3.resultId).toBe(page1.resultId);
			expect(page3.pageNumber).toBe(3);
			expect(page3.totalPages).toBe(3);
			expect(page3.hasNextPage).toBe(false);
			expect(page3.nextPageNumber).toBeNull();
			expect(typeof page3.data).toBe("string");
			expect(page3.data).toContain("This is paragraph number 25.");
		});

		test("should successfully paginate interactive elements across multiple pages using token length constraints", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPaginationTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"pagination-test",
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
			const page1 = jsonPage1 as PaginatedResultJson<unknown[]>;

			expectToBeDefined(page1);
			expect(typeof page1.resultId).toBe("string");
			expect(page1.pageNumber).toBe(1);
			expect(page1.totalPages).toBeGreaterThanOrEqual(100); // 249 elements split by 100 chars max will yield > 100 pages
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPageNumber).toBe(2);
			assertPageConstraints(page1.data);

			// 2. Fetch Page 2 from cache
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`${tabUri}/readable-elements/pages/2`,
			);
			const page2 = jsonPage2 as PaginatedResultJson<unknown[]>;

			expectToBeDefined(page2);
			expect(page2.resultId).toBe(page1.resultId);
			expect(page2.pageNumber).toBe(2);
			expect(page2.totalPages).toBe(page1.totalPages);
			expect(page2.hasNextPage).toBe(true);
			expect(page2.nextPageNumber).toBe(3);
			assertPageConstraints(page2.data);

			// 3. Fetch Last Page from cache
			const lastPageNumber = page1.totalPages;
			const { json: jsonPageLast } = await mcpClientPage.readResource(
				`${tabUri}/readable-elements/pages/${lastPageNumber}`,
			);
			const pageLast = jsonPageLast as PaginatedResultJson<unknown[]>;

			expectToBeDefined(pageLast);
			expect(pageLast.resultId).toBe(page1.resultId);
			expect(pageLast.pageNumber).toBe(lastPageNumber);
			expect(pageLast.totalPages).toBe(lastPageNumber);
			expect(pageLast.hasNextPage).toBe(false);
			expect(pageLast.nextPageNumber).toBeNull();
			assertPageConstraints(pageLast.data);
		});

		test("should throw errors when accessing cache out of bounds or before page 1", async ({
			context,
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPaginationTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"pagination-test",
			);

			// 1. Fetch Page 1 first to populate cache
			await mcpClientPage.readResource(`${tabUri}/readable-text`);

			// 2. Access out of range page (Page 4 when only 3 exist)
			await expect(
				mcpClientPage.readResource(`${tabUri}/readable-text/pages/4`),
			).rejects.toThrow(/Page 4 out of range/);

			// 3. Open a separate tab to verify reading Page 2 before Page 1 throws
			const secondPage = await context.newPage();
			await secondPage.goto("http://localhost:3000/pagination-test");
			await secondPage.waitForLoadState("networkidle");

			const secondTabUri = await mcpClientPage.waitForTabUriByUrl(
				secondPage,
				"pagination-test",
			);

			// Try reading Page 2 immediately on this new tab (cache should be empty)
			await expect(
				mcpClientPage.readResource(`${secondTabUri}/readable-text/pages/2`),
			).rejects.toThrow(/No cached readable-text pages. Read page 1 first/);
		});

		test("should invalidate cache when the page is reloaded or navigated", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToPaginationTest();

			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"pagination-test",
			);

			// 1. Read Page 1 to populate cache
			await mcpClientPage.readResource(`${tabUri}/readable-text`);

			// 2. Verify Page 2 reads successfully
			const { json: jsonPage2 } = await mcpClientPage.readResource(
				`${tabUri}/readable-text/pages/2`,
			);
			expect(jsonPage2).toBeDefined();

			// 3. Navigate away and back to change the tab fingerprint, triggering cache invalidation
			await testAppPage.navigateToHome();
			await testAppPage.navigateToPaginationTest();

			// Wait for the tab to be updated and obtain the new tab URI if changed
			const newTabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"pagination-test",
			);

			// 4. Try reading Page 2 directly on the new/refreshed tab (should fail due to invalidation)
			await expect(
				mcpClientPage.readResource(`${newTabUri}/readable-text/pages/2`),
			).rejects.toThrow(/No cached readable-text pages. Read page 1 first/);
		});
	});
});
