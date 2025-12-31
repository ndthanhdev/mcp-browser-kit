import { extContextTest, type ExtContextFixtures, type ExtContextOptions } from './ext-context';
import { PlaywrightPage } from '../pages/playwright-page';
import { McpClientPageObject } from '../pages/mcp-client-page-object';

export type { ExtContextOptions };

export type ExtTestFixtures = ExtContextFixtures & ExtContextOptions & {
  playwrightPage: PlaywrightPage;
  mcpClientPage: McpClientPageObject;
};

export const test = extContextTest.extend<Omit<ExtTestFixtures, keyof ExtContextFixtures>>({
  playwrightPage: async ({ context }, use) => {
    const page = await context.newPage();
    const playwrightPage = new PlaywrightPage(page);
    await use(playwrightPage);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring pattern
  mcpClientPage: async ({}, use) => {
    const mcpClientPage = new McpClientPageObject();
    await use(mcpClientPage);
  },
});

export { expect } from '@playwright/test';
