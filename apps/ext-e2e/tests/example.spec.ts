import { test, expect } from '../fixtures/ext-test';

test('has title', async ({ playwrightPage }) => {
  await playwrightPage.navigate();
  await expect(playwrightPage.page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ playwrightPage }) => {
  await playwrightPage.navigate();
  await playwrightPage.clickGetStarted();
  await expect(playwrightPage.installationHeading).toBeVisible();
});
