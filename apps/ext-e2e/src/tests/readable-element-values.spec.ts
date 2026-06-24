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

// ReadableElementRecord as serialized over MCP: [path, role, text, value?].
// The optional 4th element is present only when the element has a current
// form value (text inputs/textarea/select) or is a checked checkbox/radio.
type ElementTuple = [
	string,
	string,
	string,
	string?,
];

test.describe("Readable element values", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test('checked checkbox surfaces value "checked"', async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();

		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const result = await mcpClientPage.callToolJson<
			SnapshotResultJson<ElementTuple[]>
		>("getReadableElements", {
			browserId: tab.browserId,
			tabId: tab.tabId,
		});

		const subscribe = result.data.find(
			(el) => el[1] === "input" && el[2]?.includes("Subscribe to newsletter"),
		);
		expectToBeDefined(subscribe);
		expect(subscribe.length).toBe(4);
		expect(subscribe[3]).toBe("checked");
	});

	test("unchecked checkbox and untouched input omit the value (3-tuple)", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await testAppPage.navigateToFormTest();

		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const result = await mcpClientPage.callToolJson<
			SnapshotResultJson<ElementTuple[]>
		>("getReadableElements", {
			browserId: tab.browserId,
			tabId: tab.tabId,
		});

		const marketing = result.data.find(
			(el) => el[1] === "input" && el[2]?.includes("Receive marketing emails"),
		);
		expectToBeDefined(marketing);
		expect(marketing.length).toBe(3);

		const email = result.data.find(
			(el) => el[1] === "input" && el[2]?.includes("Enter email"),
		);
		expectToBeDefined(email);
		expect(email.length).toBe(3);
	});

	test("filled input value appears as the 4th tuple element", async ({
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

		await mcpClientPage.callTool("fillTextToElement", {
			...tab,
			readablePath: usernameInputPath,
			value: "testuser123",
		});

		const result = await mcpClientPage.callToolJson<
			SnapshotResultJson<ElementTuple[]>
		>("getReadableElements", {
			browserId: tab.browserId,
			tabId: tab.tabId,
		});

		const username = result.data.find((el) => el[0] === usernameInputPath);
		expectToBeDefined(username);
		expect(username.length).toBe(4);
		expect(username[3]).toBe("testuser123");
	});
});
