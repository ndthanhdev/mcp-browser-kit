import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject } from "../pages";
import type { TabRef } from "../pages/mcp-client-page-object";
import { expectToBeDefined } from "../test-utils/assert-defined";

const findPath = async (
	mcpClientPage: McpClientPageObject,
	tabUri: string,
	text: string,
): Promise<string> => {
	const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
	const path = elements.find((el) => el[2]?.includes(text))?.[0];
	expectToBeDefined(path);
	return path;
};

const textOf = (result: unknown): string => {
	const first = (
		result as {
			content?: {
				type: string;
				text?: string;
			}[];
		}
	).content?.[0];
	return first?.type === "text" ? (first.text ?? "") : "";
};

test.describe("Write tool auto-wait and page-change diffs", () => {
	let tab: TabRef;
	let tabUri: string;

	test.beforeEach(async ({ testAppPage, mcpClientPage }) => {
		test.setTimeout(45000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
		await testAppPage.navigateToAutoWaitTest();
		tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"auto-wait-test",
		);
		tabUri = await mcpClientPage.waitForTabUriByUrl(
			testAppPage.page,
			"auto-wait-test",
		);
	});

	test("waits for a disabled button to become enabled before clicking", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		const armPath = await findPath(mcpClientPage, tabUri, "Arm Delayed");
		const delayedPath = await findPath(mcpClientPage, tabUri, "Delayed Action");

		await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: armPath,
		});
		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: delayedPath,
		});

		expect(result.structuredContent?.ok).toBe(true);
		await expect(
			testAppPage.getAutoWaitTestLocators().delayedCount,
		).toContainText("Delayed Count: 1");
	});

	test("fails with a clear reason when the target is covered", async ({
		mcpClientPage,
	}) => {
		const coveredPath = await findPath(mcpClientPage, tabUri, "Covered Button");

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: coveredPath,
		});

		expect(result.structuredContent?.ok).toBe(false);
		expect(result.structuredContent?.reason).toContain("covered by");
	});

	test("returns a diff of elements added by an async update", async ({
		mcpClientPage,
	}) => {
		const loadPath = await findPath(mcpClientPage, tabUri, "Load Results");

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: loadPath,
		});

		const value = result.structuredContent?.value;
		expectToBeDefined(value);
		expect(value.changed).toBe(true);
		expect(value.navigated).toBe(false);
		expect(value.tooLarge).toBe(false);
		expect(value.added).toBeGreaterThanOrEqual(3);
		expectToBeDefined(value.diff);
		const addedLines = value.diff
			.split("\n")
			.filter((line) => line.startsWith("+ "));
		for (const label of [
			"Result 1",
			"Result 2",
			"Result 3",
		]) {
			expect(addedLines.some((line) => line.includes(label))).toBe(true);
		}
		expect(textOf(result)).toContain("```diff");
	});

	test("diff paths are usable directly without re-reading", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		const loadPath = await findPath(mcpClientPage, tabUri, "Load Results");
		const loadResult = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: loadPath,
		});
		const diff = loadResult.structuredContent?.value?.diff;
		expectToBeDefined(diff);
		const line = diff
			.split("\n")
			.find((l) => l.startsWith("+ ") && l.includes("Result 2"));
		expectToBeDefined(line);
		const [path] = JSON.parse(line.slice(2)) as string[];

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: path,
		});
		expect(result.structuredContent?.ok).toBe(true);
		await expect(
			testAppPage.getAutoWaitTestLocators().pickedResult,
		).toContainText("Picked: Result 2");
	});

	test("reports a filled value as a changed line", async ({
		mcpClientPage,
	}) => {
		const notePath = await findPath(mcpClientPage, tabUri, "Note");

		const result = await mcpClientPage.callTool("fillTextToElement", {
			...tab,
			readablePath: notePath,
			value: "hello",
		});

		const value = result.structuredContent?.value;
		expectToBeDefined(value);
		expect(value.changed).toBe(true);
		expect(value.added).toBe(1);
		expect(value.removed).toBe(1);
		expect(value.diff).toMatch(/^\+ .*"Note".*"hello"/m);
		expect(value.diff).toMatch(/^- .*"Note"/m);
	});

	test("reports navigation instead of a diff", async ({ mcpClientPage }) => {
		const linkPath = await findPath(mcpClientPage, tabUri, "Go To Click Test");

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: linkPath,
		});

		const value = result.structuredContent?.value;
		expectToBeDefined(value);
		expect(value.navigated).toBe(true);
		expect(value.url).toContain("click-test");
		expect(value.diff).toBeUndefined();
		expect(textOf(result)).toContain("Navigated to");
	});

	test("flags a too-large change without sending the diff", async ({
		mcpClientPage,
	}) => {
		const manyPath = await findPath(mcpClientPage, tabUri, "Render Many");

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: manyPath,
		});

		const value = result.structuredContent?.value;
		expectToBeDefined(value);
		expect(value.changed).toBe(true);
		expect(value.tooLarge).toBe(true);
		expect(value.added).toBeGreaterThanOrEqual(1_000);
		expect(value.diff).toBeUndefined();
		expect(textOf(result)).toContain("diff too large");
	});

	test("element ids stay valid after elements are inserted above", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		const targetId = await findPath(mcpClientPage, tabUri, "Stable Target");
		const insertId = await findPath(mcpClientPage, tabUri, "Insert Above");
		expect(targetId).toMatch(/^f[0-9a-z]+:e[0-9a-z]+$/);

		for (let i = 0; i < 3; i++) {
			await mcpClientPage.callTool("clickOnElement", {
				...tab,
				readablePath: insertId,
			});
		}

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: targetId,
		});
		expect(result.structuredContent?.ok).toBe(true);
		await expect(
			testAppPage.getAutoWaitTestLocators().targetClicks,
		).toContainText("Target Clicks: 1");

		expect(await findPath(mcpClientPage, tabUri, "Stable Target")).toBe(
			targetId,
		);
	});

	test("an id of a removed element fails with a clear reason", async ({
		mcpClientPage,
	}) => {
		const targetId = await findPath(mcpClientPage, tabUri, "Stable Target");
		const removeId = await findPath(mcpClientPage, tabUri, "Remove Target");

		await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: removeId,
		});
		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: targetId,
		});

		expect(result.structuredContent?.ok).toBe(false);
		expect(
			`${result.structuredContent?.reason ?? ""} ${textOf(result)}`,
		).toContain("no longer exists");
	});

	test("rejects legacy positional paths", async ({ mcpClientPage }) => {
		const targetId = await findPath(mcpClientPage, tabUri, "Stable Target");
		const frameId = targetId.split(":")[0];
		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: `${frameId}:0.1.2`,
		});

		expect(result.structuredContent?.ok).toBe(false);
		expect(
			`${result.structuredContent?.reason ?? ""} ${textOf(result)}`,
		).toContain("positional path");
	});

	test("rejects legacy numeric frame ids", async ({ mcpClientPage }) => {
		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: "0:e1",
		});

		expect(result.structuredContent?.ok).toBe(false);
		expect(
			`${result.structuredContent?.reason ?? ""} ${textOf(result)}`,
		).toContain("numeric frame id");
	});

	test("an id read before a reload fails instead of hitting a new element", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		const targetId = await findPath(mcpClientPage, tabUri, "Stable Target");

		await testAppPage.page.reload();
		await expect(
			testAppPage.getAutoWaitTestLocators().targetClicks,
		).toBeVisible();
		const oldFrame = targetId.split(":")[0];
		await expect
			.poll(async () => {
				const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
				const frame = elements
					.find((el) => el[2]?.includes("Stable Target"))?.[0]
					?.split(":")[0];
				return frame !== undefined && frame !== oldFrame;
			})
			.toBe(true);

		const result = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: targetId,
		});
		expect(result.structuredContent?.ok).toBe(false);
		expect(
			`${result.structuredContent?.reason ?? ""} ${textOf(result)}`,
		).toMatch(/no longer exists|reloaded or navigated/);
		await expect(
			testAppPage.getAutoWaitTestLocators().targetClicks,
		).toContainText("Target Clicks: 0");
	});
});
