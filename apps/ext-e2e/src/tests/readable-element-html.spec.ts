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

test.describe("Readable element HTML", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test("getReadableElementHtml returns the element's outerHTML", async ({
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
		expectToBeDefined(usernameInputPath);

		const result = await mcpClientPage.callToolJson<SnapshotResultJson<string>>(
			"getReadableElementHtml",
			{
				browserId: tab.browserId,
				tabId: tab.tabId,
				readablePath: usernameInputPath,
			},
		);

		expect(typeof result.snapshotId).toBe("string");
		expect(result.pageNumber).toBe(1);
		expect(typeof result.data).toBe("string");
		// outerHTML of the username <input> — starts with a tag and carries its
		// placeholder attribute.
		expect(result.data.startsWith("<")).toBe(true);
		expect(result.data).toContain("Enter username");
	});

	test("readable-element-html resource matches the tool output", async ({
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
		expectToBeDefined(usernameInputPath);

		const toolResult = await mcpClientPage.callToolJson<
			SnapshotResultJson<string>
		>("getReadableElementHtml", {
			browserId: tab.browserId,
			tabId: tab.tabId,
			readablePath: usernameInputPath,
		});

		const resourceText = await mcpClientPage.readResourceText(
			`${tabUri}/readable-element-html/${usernameInputPath}`,
		);
		const resourceResult = JSON.parse(
			resourceText,
		) as SnapshotResultJson<string>;

		expect(resourceResult.data).toBe(toolResult.data);
		expect(resourceResult.totalPages).toBe(toolResult.totalPages);
	});
});
