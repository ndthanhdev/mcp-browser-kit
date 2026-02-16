import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base-page";

const TEST_APP_BASE_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

export class TestAppPage extends BasePage {
	readonly homeUrl = TEST_APP_BASE_URL;
	readonly clickTestUrl = `${TEST_APP_BASE_URL}/click-test`;
	readonly formTestUrl = `${TEST_APP_BASE_URL}/form-test`;
	readonly textTestUrl = `${TEST_APP_BASE_URL}/text-test`;
	readonly javascriptTestUrl = `${TEST_APP_BASE_URL}/javascript-test`;

	readonly pageTitle: Locator;

	constructor(page: Page) {
		super(page);
		this.pageTitle = this.getByTestId("page-title");
	}

	async navigateToHome() {
		await this.goto(this.homeUrl);
		await this.waitForPageLoad();
	}

	async navigateToClickTest() {
		await this.goto(this.clickTestUrl);
		await this.waitForPageLoad();
	}

	async navigateToFormTest() {
		await this.goto(this.formTestUrl);
		await this.waitForPageLoad();
	}

	async navigateToTextTest() {
		await this.goto(this.textTestUrl);
		await this.waitForPageLoad();
	}

	async navigateToJavaScriptTest() {
		await this.goto(this.javascriptTestUrl);
		await this.waitForPageLoad();
	}

	getClickTestLocators() {
		return {
			clickCount: this.getByTestId("click-count"),
			lastClicked: this.getByTestId("last-clicked"),
			primaryButton: this.getByTestId("primary-button"),
			secondaryButton: this.getByTestId("secondary-button"),
			dangerButton: this.getByTestId("danger-button"),
			topLeftButton: this.getByTestId("top-left-button"),
			centerButton: this.getByTestId("center-button"),
			nestedButton: this.getByTestId("nested-button"),
		};
	}

	getFormTestLocators() {
		return {
			searchInput: this.getByTestId("search-input"),
			searchButton: this.getByTestId("search-button"),
			searchResult: this.getByTestId("search-result"),
			usernameInput: this.getByTestId("username-input"),
			emailInput: this.getByTestId("email-input"),
			passwordInput: this.getByTestId("password-input"),
			messageTextarea: this.getByTestId("message-textarea"),
			submitButton: this.getByTestId("submit-button"),
			submittedData: this.getByTestId("submitted-data"),
			formState: this.getByTestId("form-state"),
		};
	}

	getTextTestLocators() {
		return {
			heading1: this.getByTestId("heading-1"),
			paragraph1: this.getByTestId("paragraph-1"),
			selectableText: this.getByTestId("selectable-text"),
			dataTable: this.getByTestId("data-table"),
			navigation: this.getByTestId("navigation"),
			ariaButtonClose: this.getByTestId("aria-button-close"),
		};
	}

	getJavaScriptTestLocators() {
		return {
			pageInfo: this.getByTestId("page-info"),
			renderCount: this.getByTestId("render-count"),
			testContainer: this.getByTestId("test-container"),
			dynamicContent: this.getByTestId("dynamic-content"),
			styleTarget: this.getByTestId("style-target"),
			dataElement: this.getByTestId("data-element"),
		};
	}
}
