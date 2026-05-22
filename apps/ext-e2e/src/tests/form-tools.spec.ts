import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

test.describe("Form Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("fillTextToElement", () => {
		test("fills text into input by readable path", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"form-test",
			);
			const paginatedResult = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as {
				data: [
					string,
					string,
					string,
				][];
			};
			const elements = paginatedResult.data;
			const usernameInputPath = elements.find(
				(el) => el[1] === "input" && el[2]?.includes("Enter username"),
			)?.[0];
			expectToBeDefined(usernameInputPath);

			await mcpClientPage.callTool("fillTextToElement", {
				tabKey,
				readablePath: usernameInputPath,
				value: "testuser123",
			});

			const locators = testAppPage.getFormTestLocators();
			await expect(locators.usernameInput).toHaveValue("testuser123");
		});

		test("fills text into textarea by readable path", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"form-test",
			);
			const paginatedResult = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as {
				data: [
					string,
					string,
					string,
				][];
			};
			const elements = paginatedResult.data;
			const textareaPath = elements.find(
				(el) => el[1] === "textarea" && el[2]?.includes("Enter your message"),
			)?.[0];
			expectToBeDefined(textareaPath);

			const testMessage = "This is a test message\nwith multiple lines";
			await mcpClientPage.callTool("fillTextToElement", {
				tabKey,
				readablePath: textareaPath,
				value: testMessage,
			});

			const locators = testAppPage.getFormTestLocators();
			await expect(locators.messageTextarea).toHaveValue(testMessage);
		});
	});

	test.describe("fillTextToCoordinates", () => {
		test("fills text into input at coordinates", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);

			const locators = testAppPage.getFormTestLocators();
			const emailBox = await locators.emailInput.boundingBox();
			expectToBeDefined(emailBox);

			await mcpClientPage.callTool("fillTextToCoordinates", {
				tabKey,
				x: emailBox.x + emailBox.width / 2,
				y: emailBox.y + emailBox.height / 2,
				value: "test@example.com",
			});

			await expect(locators.emailInput).toHaveValue("test@example.com");
		});
	});

	test.describe("hitEnterOnElement", () => {
		test("submits search form with enter key", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"form-test",
			);
			const paginatedResult = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as {
				data: [
					string,
					string,
					string,
				][];
			};
			const elements = paginatedResult.data;
			const searchInputPath = elements.find(
				(el) => el[1] === "input" && el[2]?.includes("Search"),
			)?.[0];
			expectToBeDefined(searchInputPath);

			await mcpClientPage.callTool("fillTextToElement", {
				tabKey,
				readablePath: searchInputPath,
				value: "test search query",
			});

			await mcpClientPage.callTool("hitEnterOnElement", {
				tabKey,
				readablePath: searchInputPath,
			});

			const locators = testAppPage.getFormTestLocators();
			await expect(locators.searchResult).toContainText("test search query");
		});
	});

	test.describe("hitEnterOnCoordinates", () => {
		test("submits form with enter key at coordinates", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);

			const locators = testAppPage.getFormTestLocators();
			const searchBox = await locators.searchInput.boundingBox();
			expectToBeDefined(searchBox);

			await mcpClientPage.callTool("fillTextToCoordinates", {
				tabKey,
				x: searchBox.x + searchBox.width / 2,
				y: searchBox.y + searchBox.height / 2,
				value: "coordinate search",
			});

			await mcpClientPage.callTool("hitEnterOnCoordinates", {
				tabKey,
				x: searchBox.x + searchBox.width / 2,
				y: searchBox.y + searchBox.height / 2,
			});

			await expect(locators.searchResult).toContainText("coordinate search");
		});
	});

	test.describe("Form submission workflow", () => {
		test("fills and submits complete registration form", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tabKey = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"form-test",
			);
			const paginatedResult = JSON.parse(
				await mcpClientPage.readResourceText(`${tabUri}/readable-elements`),
			) as {
				data: [
					string,
					string,
					string,
				][];
			};
			const elements = paginatedResult.data;

			const usernameInputPath = elements.find((el) =>
				el[2]?.includes("Enter username"),
			)?.[0];
			const emailInputPath = elements.find((el) =>
				el[2]?.includes("Enter email"),
			)?.[0];
			const submitButtonPath = elements.find((el) =>
				el[2]?.includes("Submit Form"),
			)?.[0];

			if (usernameInputPath) {
				await mcpClientPage.callTool("fillTextToElement", {
					tabKey,
					readablePath: usernameInputPath,
					value: "formuser",
				});
			}

			if (emailInputPath) {
				await mcpClientPage.callTool("fillTextToElement", {
					tabKey,
					readablePath: emailInputPath,
					value: "form@example.com",
				});
			}

			if (submitButtonPath) {
				await mcpClientPage.callTool("clickOnElement", {
					tabKey,
					readablePath: submitButtonPath,
				});
			}

			const locators = testAppPage.getFormTestLocators();
			await expect(locators.submittedData).toBeVisible();
			await expect(locators.submittedData).toContainText("formuser");
		});
	});
});
