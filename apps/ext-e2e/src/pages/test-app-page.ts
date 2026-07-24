import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base-page";

const TEST_APP_BASE_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

export class TestAppPage extends BasePage {
	readonly homeUrl = TEST_APP_BASE_URL;
	readonly clickTestUrl = `${TEST_APP_BASE_URL}/click-test`;
	readonly formTestUrl = `${TEST_APP_BASE_URL}/form-test`;
	readonly textTestUrl = `${TEST_APP_BASE_URL}/text-test`;
	readonly javascriptTestUrl = `${TEST_APP_BASE_URL}/javascript-test`;
	readonly fallbackTestUrl = `${TEST_APP_BASE_URL}/fallback-test`;
	readonly snapshotTestUrl = `${TEST_APP_BASE_URL}/snapshot-test`;
	readonly scrollTestUrl = `${TEST_APP_BASE_URL}/scroll-test`;
	readonly iframeTestUrl = `${TEST_APP_BASE_URL}/iframe-test`;
	readonly popupTestUrl = `${TEST_APP_BASE_URL}/popup-test`;

	readonly pageTitle: Locator;

	constructor(page: Page) {
		super(page);
		this.pageTitle = this.getByTestId("page-title");
	}

	override async waitForPageLoad() {
		await super.waitForPageLoad(this.pageTitle);
	}

	async navigateToHome() {
		await this.goto(this.homeUrl);
		await super.waitForPageLoad(this.getByTestId("nav-click-test"));
	}

	async navigateToClickTest() {
		await this.goto(this.clickTestUrl);
		await super.waitForPageLoad(this.getByTestId("click-count"));
	}

	async navigateToFormTest() {
		await this.goto(this.formTestUrl);
		await super.waitForPageLoad(this.getByTestId("search-input"));
	}

	async navigateToTextTest() {
		await this.goto(this.textTestUrl);
		await super.waitForPageLoad(this.getByTestId("heading-1"));
	}

	async navigateToSnapshotTest() {
		await this.goto(this.snapshotTestUrl);
		await super.waitForPageLoad(this.getByTestId("page-title"));
	}

	async navigateToScrollTest() {
		await this.goto(this.scrollTestUrl);
		await super.waitForPageLoad(this.getByTestId("page-title"));
	}

	async navigateToJavaScriptTest() {
		await this.goto(this.javascriptTestUrl);
		await super.waitForPageLoad(this.getByTestId("page-info"));
	}

	async navigateToIframeTest() {
		await this.goto(this.iframeTestUrl);
		await super.waitForPageLoad(this.getByTestId("outer-button"));
	}

	async navigateToIframeTestCrossOrigin() {
		await this.goto(`${this.iframeTestUrl}?crossOrigin=1`);
		await super.waitForPageLoad(this.getByTestId("outer-button"));
	}

	async navigateToPopupTest() {
		await this.goto(this.popupTestUrl);
		await super.waitForPageLoad(this.getByTestId("open-popup-button"));
	}

	async navigateToFallbackTest() {
		await this.goto(this.fallbackTestUrl);
		await super.waitForPageLoad(this.getByTestId("resistant-button"));
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

	getFallbackTestLocators() {
		return {
			resistantButton: this.getByTestId("resistant-button"),
			mousedownCount: this.getByTestId("mousedown-count"),
			standardButton: this.getByTestId("standard-button"),
			standardClickCount: this.getByTestId("standard-click-count"),
		};
	}

	getScrollTestLocators() {
		return {
			scrollY: this.getByTestId("scroll-y"),
			scrollX: this.getByTestId("scroll-x"),
			containerScrollTop: this.getByTestId("container-scroll-top"),
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

	getIframeTestLocators() {
		return {
			testIframe: this.getByTestId("test-iframe"),
			outerButton: this.getByTestId("outer-button"),
			outerClickCount: this.getByTestId("outer-click-count"),
			iframeClickCountMirror: this.getByTestId("iframe-click-count-mirror"),
		};
	}

	getPopupTestLocators() {
		return {
			openPopupButton: this.getByTestId("open-popup-button"),
			openerButton: this.getByTestId("opener-button"),
			openerClickCount: this.getByTestId("opener-click-count"),
		};
	}
}
