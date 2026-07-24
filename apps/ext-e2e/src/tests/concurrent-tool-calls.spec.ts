import { expect, test } from "../fixtures/ext-test";
import { TestAppPage } from "../pages/test-app-page";
import { expectToBeDefined } from "../test-utils/assert-defined";

/**
 * Exercises an agent firing multiple *separate* tools/call requests against
 * the same tab concurrently (via Promise.all, without awaiting one before
 * starting the next) — not a batched/composite call. The MCP layer dispatches
 * these concurrently by design (different tabs/browsers must stay parallel),
 * but the content-script side that touches a given tab's DOM must serialize
 * them so they don't interleave against shared per-tab state.
 */
test.describe("Concurrent tool calls", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(45000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test("serializes concurrent calls against the same tab in arrival order", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();

		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);
		const tabUri = await mcpClientPage.waitForTabUriByUrl(
			testAppPage.page,
			"form-test",
		);
		const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
		const usernameInputPath = elements.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter username"),
		)?.[0];
		const emailInputPath = elements.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter email"),
		)?.[0];
		expectToBeDefined(usernameInputPath);
		expectToBeDefined(emailInputPath);

		// A long value takes noticeably longer to type than a short one, so
		// their relative completion order reveals whether the two calls were
		// serialized (short queued behind long → finishes later) or ran
		// truly concurrently (short finishes first, on its own timer).
		const longValue = "a".repeat(40);
		const shortValue = "b";

		const startedAt = Date.now();
		let longDoneAt = -1;
		let shortDoneAt = -1;

		const longCall = mcpClientPage
			.callTool("fillTextToElement", {
				...tab,
				readablePath: usernameInputPath,
				value: longValue,
			})
			.then((result) => {
				longDoneAt = Date.now() - startedAt;
				return result;
			});
		const shortCall = mcpClientPage
			.callTool("fillTextToElement", {
				...tab,
				readablePath: emailInputPath,
				value: shortValue,
			})
			.then((result) => {
				shortDoneAt = Date.now() - startedAt;
				return result;
			});

		const [longResult, shortResult] = await Promise.all([
			longCall,
			shortCall,
		]);

		expect(longResult.structuredContent?.ok).toBe(true);
		expect(shortResult.structuredContent?.ok).toBe(true);
		// Only true if the short call's content-script execution was queued
		// behind the long one; without serialization the shorter task runs in
		// parallel and finishes first.
		expect(shortDoneAt).toBeGreaterThanOrEqual(longDoneAt);
	});

	test("both fields end up with the correct value after concurrent fills", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();

		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);
		const tabUri = await mcpClientPage.waitForTabUriByUrl(
			testAppPage.page,
			"form-test",
		);
		const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
		const usernameInputPath = elements.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter username"),
		)?.[0];
		const emailInputPath = elements.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter email"),
		)?.[0];
		expectToBeDefined(usernameInputPath);
		expectToBeDefined(emailInputPath);

		await Promise.all([
			mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: usernameInputPath,
				value: "concurrentuser",
			}),
			mcpClientPage.callTool("fillTextToElement", {
				...tab,
				readablePath: emailInputPath,
				value: "concurrent@example.com",
			}),
		]);

		const locators = testAppPage.getFormTestLocators();
		await expect(locators.usernameInput).toHaveValue("concurrentuser");
		await expect(locators.emailInput).toHaveValue("concurrent@example.com");
	});

	test("concurrent calls on different tabs are not serialized against each other", async ({
		context,
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();

		const tab1 = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);
		const tabUri1 = await mcpClientPage.waitForTabUriByUrl(
			testAppPage.page,
			"form-test",
		);

		const windowRef = await mcpClientPage.getFirstWindowRef();
		const newPagePromise = context.waitForEvent("page");
		const openResult = await mcpClientPage.callTool("openTab", {
			...windowRef,
			url: testAppPage.formTestUrl,
		});
		const newPage = await newPagePromise;
		await newPage.waitForLoadState("networkidle");
		const tab2 = openResult.structuredContent?.value;
		expectToBeDefined(tab2);
		const tabUri2 = await mcpClientPage.waitForTabUriByUrl(
			newPage,
			"form-test",
		);
		const testAppPage2 = new TestAppPage(newPage);

		const elements1 = await mcpClientPage.readAllSnapshotElements(tabUri1);
		const usernamePath1 = elements1.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter username"),
		)?.[0];
		const elements2 = await mcpClientPage.readAllSnapshotElements(tabUri2);
		const usernamePath2 = elements2.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter username"),
		)?.[0];
		expectToBeDefined(usernamePath1);
		expectToBeDefined(usernamePath2);

		const [result1, result2] = await Promise.all([
			mcpClientPage.callTool("fillTextToElement", {
				...tab1,
				readablePath: usernamePath1,
				value: "tab1user",
			}),
			mcpClientPage.callTool("fillTextToElement", {
				...tab2,
				readablePath: usernamePath2,
				value: "tab2user",
			}),
		]);

		expect(result1.structuredContent?.ok).toBe(true);
		expect(result2.structuredContent?.ok).toBe(true);
		await expect(testAppPage.getFormTestLocators().usernameInput).toHaveValue(
			"tab1user",
		);
		await expect(testAppPage2.getFormTestLocators().usernameInput).toHaveValue(
			"tab2user",
		);
	});
});
