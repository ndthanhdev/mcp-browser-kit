import type { Locator } from "@playwright/test";
import { expect, test } from "../fixtures/ext-test";

/** Parses the integer rendered in a "scrollX: N" / "scrollY: N" readout. */
async function readScroll(locator: Locator): Promise<number> {
	const text = (await locator.textContent()) ?? "";
	const match = text.match(/-?\d+/);
	return match ? Number(match[0]) : Number.NaN;
}

test.describe("Scroll Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test("scrolls down by ~one viewport when no amount is given", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToScrollTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"scroll-test",
		);

		const locators = testAppPage.getScrollTestLocators();
		expect(await readScroll(locators.scrollY)).toBe(0);

		const result = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "down",
		});
		expect(result.structuredContent?.ok).toBe(true);

		await expect.poll(() => readScroll(locators.scrollY)).toBeGreaterThan(100);
	});

	test("scrolls down by an explicit pixel amount", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToScrollTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"scroll-test",
		);

		const locators = testAppPage.getScrollTestLocators();

		const result = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "down",
			amount: 400,
		});
		expect(result.structuredContent?.ok).toBe(true);

		await expect.poll(() => readScroll(locators.scrollY)).toBeGreaterThan(390);
		expect(await readScroll(locators.scrollY)).toBeLessThanOrEqual(410);
	});

	test("scrolls back up toward the top", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToScrollTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"scroll-test",
		);

		const locators = testAppPage.getScrollTestLocators();

		await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "down",
			amount: 800,
		});
		await expect.poll(() => readScroll(locators.scrollY)).toBeGreaterThan(700);

		const result = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "up",
			amount: 800,
		});
		expect(result.structuredContent?.ok).toBe(true);

		await expect.poll(() => readScroll(locators.scrollY)).toBe(0);
	});

	test("scrolls horizontally right then left", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToScrollTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"scroll-test",
		);

		const locators = testAppPage.getScrollTestLocators();
		expect(await readScroll(locators.scrollX)).toBe(0);

		const rightResult = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "right",
			amount: 300,
		});
		expect(rightResult.structuredContent?.ok).toBe(true);
		await expect.poll(() => readScroll(locators.scrollX)).toBeGreaterThan(290);

		const leftResult = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "left",
			amount: 300,
		});
		expect(leftResult.structuredContent?.ok).toBe(true);
		await expect.poll(() => readScroll(locators.scrollX)).toBe(0);
	});

	test("scrolling up at the top is a no-op success", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToScrollTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"scroll-test",
		);

		const locators = testAppPage.getScrollTestLocators();
		expect(await readScroll(locators.scrollY)).toBe(0);

		const result = await mcpClientPage.callTool("scrollPage", {
			...tab,
			direction: "up",
		});
		expect(result.structuredContent?.ok).toBe(true);
		expect(await readScroll(locators.scrollY)).toBe(0);
	});

	test.describe("scrollElement", () => {
		test("scrolls a scrollable container without moving the page", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToScrollTest();
			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"scroll-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"scroll-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const containerPath = elements.find((el) =>
				el[2]?.includes("Scrollable list"),
			)?.[0];
			expect(containerPath).toBeDefined();

			const locators = testAppPage.getScrollTestLocators();
			expect(await readScroll(locators.containerScrollTop)).toBe(0);

			const result = await mcpClientPage.callTool("scrollElement", {
				...tab,
				readablePath: containerPath as string,
				direction: "down",
			});
			expect(result.structuredContent?.ok).toBe(true);

			await expect
				.poll(() => readScroll(locators.containerScrollTop))
				.toBeGreaterThan(50);
			// The page itself must not have scrolled.
			expect(await readScroll(locators.scrollY)).toBe(0);
		});

		test("scrolls the container by an explicit pixel amount", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToScrollTest();
			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"scroll-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"scroll-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const containerPath = elements.find((el) =>
				el[2]?.includes("Scrollable list"),
			)?.[0];
			expect(containerPath).toBeDefined();

			const locators = testAppPage.getScrollTestLocators();

			const result = await mcpClientPage.callTool("scrollElement", {
				...tab,
				readablePath: containerPath as string,
				direction: "down",
				amount: 200,
			});
			expect(result.structuredContent?.ok).toBe(true);

			await expect
				.poll(() => readScroll(locators.containerScrollTop))
				.toBeGreaterThan(190);
			expect(await readScroll(locators.containerScrollTop)).toBeLessThanOrEqual(
				210,
			);
		});

		test("scrolls the container back up toward the top", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToScrollTest();
			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"scroll-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"scroll-test",
			);

			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const containerPath = elements.find((el) =>
				el[2]?.includes("Scrollable list"),
			)?.[0];
			expect(containerPath).toBeDefined();

			const locators = testAppPage.getScrollTestLocators();

			await mcpClientPage.callTool("scrollElement", {
				...tab,
				readablePath: containerPath as string,
				direction: "down",
				amount: 400,
			});
			await expect
				.poll(() => readScroll(locators.containerScrollTop))
				.toBeGreaterThan(300);

			const result = await mcpClientPage.callTool("scrollElement", {
				...tab,
				readablePath: containerPath as string,
				direction: "up",
				amount: 400,
			});
			expect(result.structuredContent?.ok).toBe(true);

			await expect.poll(() => readScroll(locators.containerScrollTop)).toBe(0);
		});
	});
});
