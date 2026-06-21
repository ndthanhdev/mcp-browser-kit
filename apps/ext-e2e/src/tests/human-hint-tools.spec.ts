import { expect, test } from "../fixtures/ext-test";
import { expectToBeDefined } from "../test-utils/assert-defined";

interface HumanHintResult {
	ok: boolean;
	reason?: string;
	action: string;
	target?: {
		type: string;
		readablePath?: string;
		x?: number;
		y?: number;
	};
	value?: string;
	message: string;
	humanMessage: string;
	tab: {
		title: string;
		url: string;
	};
	expiresInSeconds: number;
}

test.describe("Human Hint Tools", () => {
	test.beforeEach(async ({ mcpClientPage }) => {
		test.setTimeout(30000);
		await mcpClientPage.startServer();
		await mcpClientPage.connect();
		await mcpClientPage.waitForBrowsers();
	});

	test.describe("showHumanHint with readablePath", () => {
		test("shows overlay and returns humanMessage for click action", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"click-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Click this button to proceed.",
				readablePath: primaryButtonPath,
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(true);
			expect(structured.action).toBe("click");
			expect(structured.humanMessage).toContain(
				"Please click the highlighted element.",
			);
			expect(structured.humanMessage).toContain(
				"Click this button to proceed.",
			);
			expect(structured.expiresInSeconds).toBe(60);
			expect(structured.target).toBeDefined();
			expect(structured.target?.type).toBe("readablePath");

			const overlayRoot = testAppPage.page.locator("#mbk-human-hint-root");
			await expect(overlayRoot).toBeVisible({
				timeout: 5000,
			});

			const calloutText = testAppPage.page.locator("[data-mbk-hint-text]");
			await expect(calloutText).toContainText(
				"Please click the highlighted element.",
			);
		});

		test("shows overlay for fill action with value", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToFormTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"form-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"form-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const usernameInputPath = elements.find(
				(el) => el[1] === "input" && el[2]?.includes("Enter username"),
			)?.[0];
			expectToBeDefined(usernameInputPath);

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "fill",
				message: "Type your username here.",
				value: "testuser123",
				readablePath: usernameInputPath,
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(true);
			expect(structured.action).toBe("fill");
			expect(structured.humanMessage).toContain(
				'Please type "testuser123" into the highlighted field.',
			);
			expect(structured.humanMessage).toContain("Type your username here.");
			expect(structured.value).toBe("testuser123");

			const overlayRoot = testAppPage.page.locator("#mbk-human-hint-root");
			await expect(overlayRoot).toBeVisible({
				timeout: 5000,
			});
		});
	});

	test.describe("showHumanHint with coordinates", () => {
		test("shows overlay at coordinates for click action", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);

			const locators = testAppPage.getClickTestLocators();
			const buttonBox = await locators.secondaryButton.boundingBox();
			expectToBeDefined(buttonBox);

			const centerX = buttonBox.x + buttonBox.width / 2;
			const centerY = buttonBox.y + buttonBox.height / 2;

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Click the secondary button.",
				x: centerX,
				y: centerY,
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(true);
			expect(structured.target?.type).toBe("coordinates");
			expect(structured.expiresInSeconds).toBe(60);

			const overlayRoot = testAppPage.page.locator("#mbk-human-hint-root");
			await expect(overlayRoot).toBeVisible({
				timeout: 5000,
			});
		});
	});

	test.describe("showHumanHint validation errors", () => {
		test("returns error when fill action has no value", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"click-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "fill",
				message: "Fill in username.",
				readablePath: primaryButtonPath,
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(false);
			expect(structured.reason).toBe("fill action requires value");
			expect(structured.humanMessage).toBeDefined();
		});

		test("returns error when no target is provided", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Click something.",
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(false);
			expect(structured.reason).toBe("provide readablePath or x and y");
		});

		test("returns error when both readablePath and coordinates are provided", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"click-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			const result = await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Ambiguous target.",
				readablePath: primaryButtonPath,
				x: 100,
				y: 200,
			});
			const structured = result.structuredContent as unknown as HumanHintResult;

			expect(structured.ok).toBe(false);
			expect(structured.reason).toBe(
				"provide readablePath or x and y, not both",
			);
		});
	});

	test.describe("overlay lifecycle", () => {
		test("dismiss button removes the overlay", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"click-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);

			await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Click to dismiss test.",
				readablePath: primaryButtonPath,
			});

			const overlayRoot = testAppPage.page.locator("#mbk-human-hint-root");
			await expect(overlayRoot).toBeVisible({
				timeout: 5000,
			});

			const dismissButton = testAppPage.page.locator(
				'#mbk-human-hint-root button[aria-label="Dismiss hint"]',
			);
			await dismissButton.click();

			await expect(overlayRoot).not.toBeVisible({
				timeout: 3000,
			});
		});

		test("second hint replaces the first", async ({
			testAppPage,
			mcpClientPage,
		}) => {
			await testAppPage.navigateToClickTest();

			const tab = await mcpClientPage.waitForTabByUrl(
				testAppPage.page,
				"click-test",
			);
			const tabUri = await mcpClientPage.waitForTabUriByUrl(
				testAppPage.page,
				"click-test",
			);
			const elements = await mcpClientPage.readAllSnapshotElements(tabUri);
			const primaryButtonPath = elements.find((el) =>
				el[2]?.includes("Primary Button"),
			)?.[0];
			const nestedButtonPath = elements.find((el) =>
				el[2]?.includes("Nested Button"),
			)?.[0];
			expectToBeDefined(primaryButtonPath);
			expectToBeDefined(nestedButtonPath);

			await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "First hint.",
				readablePath: primaryButtonPath,
			});

			const overlayRoot = testAppPage.page.locator("#mbk-human-hint-root");
			await expect(overlayRoot).toBeVisible({
				timeout: 5000,
			});

			await mcpClientPage.callToolRaw("showHumanHint", {
				...tab,
				action: "click",
				message: "Second hint replaces first.",
				readablePath: nestedButtonPath,
			});

			const calloutText = testAppPage.page.locator("[data-mbk-hint-text]");
			await expect(calloutText).toContainText("Second hint replaces first.", {
				timeout: 5000,
			});

			const overlayCount = await testAppPage.page
				.locator("#mbk-human-hint-root")
				.count();
			expect(overlayCount).toBe(1);
		});
	});
});
