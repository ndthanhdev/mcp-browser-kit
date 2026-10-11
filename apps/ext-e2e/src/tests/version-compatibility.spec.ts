import type { ServerInfoOutputPort } from "@mcp-browser-kit/core-server";
import { expect, test } from "../fixtures/ext-test";
import type { McpClientPageObject } from "../pages";
import { expectToBeDefined } from "../test-utils/assert-defined";

type ContextJson = {
	serverVersion: string;
	browsers: Array<{
		browserId: string;
		versionMismatch?: {
			serverVersion: string;
			extensionVersion?: string;
			update?: "extension" | "server";
			message: string;
		};
	}>;
};

type FailureJson = {
	ok: boolean;
	reason?: string;
};

const start = async (
	mcpClientPage: McpClientPageObject,
	serverInfo?: ServerInfoOutputPort,
) => {
	await mcpClientPage.startServer(serverInfo);
	await mcpClientPage.connect();
	await mcpClientPage.waitForBrowsers();
};

test.describe("Server / extension version compatibility", () => {
	test.beforeEach(() => {
		test.setTimeout(30000);
	});

	test("an older extension major is flagged and its tools refused", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await start(mcpClientPage, {
			serverVersion: "10.0.0",
			extensionVersionOverride: "9.4.2",
		});
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const context = await mcpClientPage.callToolJson<ContextJson>("getContext");
		expect(context.serverVersion).toBe("10.0.0");
		const mismatch = context.browsers.find(
			(b) => b.browserId === tab.browserId,
		)?.versionMismatch;
		expectToBeDefined(mismatch);
		expect(mismatch.update).toBe("extension");
		expect(mismatch.extensionVersion).toBe("9.4.2");
		expect(mismatch.message).toContain("Update the browser extension to 10.x");

		const click = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: "0:e1",
		});
		expect(click.structuredContent?.ok).toBe(false);
		expect(click.structuredContent?.reason).toContain(
			"Update the browser extension to 10.x",
		);

		const elements = await mcpClientPage.callToolJson<FailureJson>(
			"getReadableElements",
			{
				browserId: tab.browserId,
				tabId: tab.tabId,
			},
		);
		expect(elements.ok).toBe(false);
		expect(elements.reason).toContain("Update the browser extension");
	});

	test("a newer extension major asks to update the server", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await start(mcpClientPage, {
			serverVersion: "9.0.0",
			extensionVersionOverride: "10.2.0",
		});
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const context = await mcpClientPage.callToolJson<ContextJson>("getContext");
		const mismatch = context.browsers.find(
			(b) => b.browserId === tab.browserId,
		)?.versionMismatch;
		expectToBeDefined(mismatch);
		expect(mismatch.update).toBe("server");

		const click = await mcpClientPage.callTool("clickOnElement", {
			...tab,
			readablePath: "0:e1",
		});
		expect(click.structuredContent?.ok).toBe(false);
		expect(click.structuredContent?.reason).toContain(
			"Update the MCP Browser Kit server",
		);
	});

	test("matching majors are compatible", async ({
		testAppPage,
		mcpClientPage,
	}) => {
		await start(mcpClientPage, {
			serverVersion: "10.0.0",
			extensionVersionOverride: "10.3.1",
		});
		await testAppPage.navigateToFormTest();
		const tab = await mcpClientPage.waitForTabByUrl(
			testAppPage.page,
			"form-test",
		);

		const context = await mcpClientPage.callToolJson<ContextJson>("getContext");
		for (const browser of context.browsers) {
			expect(browser.versionMismatch).toBeUndefined();
		}

		const elements = await mcpClientPage.readAllSnapshotElementsViaTool({
			browserId: tab.browserId,
			tabId: tab.tabId,
		});
		expect(elements.length).toBeGreaterThan(0);
	});

	test("unreleased builds (0.0.0) skip the check", async ({
		mcpClientPage,
	}) => {
		await start(mcpClientPage);

		const context = await mcpClientPage.callToolJson<ContextJson>("getContext");
		expect(context.serverVersion).toBe("0.0.0");
		for (const browser of context.browsers) {
			expect(browser.versionMismatch).toBeUndefined();
		}
	});
});
