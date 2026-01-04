import { McpClientPageObject } from "../pages/mcp-client-page-object";
import { PlaywrightPage } from "../pages/playwright-page";
import {
	type ExtContextFixtures,
	type ExtContextOptions,
	extContextTest,
} from "./ext-context";

export type { ExtContextOptions };

export type ExtTestFixtures = ExtContextFixtures &
	ExtContextOptions & {
		playwrightPage: PlaywrightPage;
		mcpClientPage: McpClientPageObject;
	};

export const test = extContextTest.extend<
	Omit<ExtTestFixtures, keyof ExtContextFixtures>
>({
	playwrightPage: async ({ context }, use) => {
		const page = await context.newPage();
		const playwrightPage = new PlaywrightPage(page);
		await use(playwrightPage);
	},
	mcpClientPage: async ({ context }, use) => {
		// Depend on context to ensure mcpClientPage teardown happens before context.close()
		void context;
		const mcpClientPage = new McpClientPageObject();
		await use(mcpClientPage);
		await mcpClientPage.disconnect();
	},
});

export { expect } from "@playwright/test";
