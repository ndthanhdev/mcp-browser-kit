import type { Locator, Page } from "@playwright/test";

export abstract class BasePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto(url: string) {
		await this.page.goto(url);
	}

	/**
	 * Wait for the page to be fully loaded.
	 * For 100% reliability, subclasses should override and pass a `readyElement`
	 * that indicates the page content has rendered.
	 *
	 * @param readyElement - Optional locator to wait for visibility after load states
	 * @param timeout - Optional timeout in ms (default: 30000)
	 */
	async waitForPageLoad(readyElement?: Locator, timeout = 30000) {
		await this.page.waitForLoadState("networkidle");
		if (readyElement) {
			await readyElement.waitFor({
				state: "visible",
				timeout,
			});
		}
		await this.page.waitForTimeout(1500);
	}

	async getTitle(): Promise<string> {
		return await this.page.title();
	}

	protected getLocator(selector: string): Locator {
		return this.page.locator(selector);
	}

	protected getByRole(
		role: Parameters<Page["getByRole"]>[0],
		options?: Parameters<Page["getByRole"]>[1],
	): Locator {
		return this.page.getByRole(role, options);
	}

	protected getByText(text: string | RegExp): Locator {
		return this.page.getByText(text);
	}

	protected getByTestId(testId: string): Locator {
		return this.page.getByTestId(testId);
	}
}
