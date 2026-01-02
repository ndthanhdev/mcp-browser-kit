import { test } from "../fixtures/ext-test";

test("establishes MCP server connection and initializes browsers", async ({
	playwrightPage,
	mcpClientPage,
}) => {
	await playwrightPage.navigate();
	await mcpClientPage.startServer();
	await mcpClientPage.connect();
	await mcpClientPage.waitForBrowsers();
});
