import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base-page";

export class PlaywrightPage extends BasePage {
	readonly url = "https://playwright.dev/";

	readonly getStartedLink: Locator;
	readonly installationHeading: Locator;

	constructor(page: Page) {
		super(page);
		this.getStartedLink = this.getByRole("link", {
			name: "Get started",
		});
		this.installationHeading = this.getByRole("heading", {
			name: "Installation",
		});
	}

	async navigate() {
		await this.goto(this.url);
	}

	async clickGetStarted() {
		await this.getStartedLink.click();
	}

	async verifyInstallationPageVisible() {
		await this.installationHeading.waitFor({
			state: "visible",
		});
	}
}
