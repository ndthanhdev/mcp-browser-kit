import { test } from "../fixtures/ext-test";

test.describe("MCP Connection", () => {
	test("establishes MCP server connection and initializes browsers", async ({
		playwrightPage,
		mcpClientPage,
	}) => {
		test.setTimeout(20000);
		await playwrightPage.navigate();
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});
});
