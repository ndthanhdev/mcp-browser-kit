import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export type ExtTarget = 'm2' | 'm3';

function getExtensionPath(target: ExtTarget): string {
  const basePath = path.join(__dirname, '..', '..', target, 'target', 'extension', 'tmp', 'extension');
  return basePath;
}

export type ExtContextFixtures = {
  context: BrowserContext;
  extensionId: string;
};

export type ExtContextOptions = {
  extTarget: ExtTarget;
};

export const extContextTest = base.extend<ExtContextFixtures, ExtContextOptions>({
  extTarget: ['m3', { option: true, scope: 'worker' }],

  context: async ({ extTarget, launchOptions }, use) => {
    const pathToExtension = getExtensionPath(extTarget);
    
    const context = await chromium.launchPersistentContext('', {
      ...launchOptions,
      channel: 'chromium',
      args: [
        ...(launchOptions.args ?? []),
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  
  extensionId: async ({ context, extTarget }, use) => {
    if (extTarget === 'm3') {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker');
      }
      const extensionId = serviceWorker.url().split('/')[2];
      await use(extensionId);
    } else {
      let [backgroundPage] = context.backgroundPages();
      if (!backgroundPage) {
        backgroundPage = await context.waitForEvent('backgroundpage');
      }
      const extensionId = backgroundPage.url().split('/')[2];
      await use(extensionId);
    }
  },
});
