import { defineConfig, devices } from "@playwright/test";
import type { ExtContextOptions } from "./src/fixtures/ext-context";

process.env.NODE_OPTIONS = "--require @swc-node/register";

export default defineConfig<ExtContextOptions>({
	testDir: "./src/tests",
	outputDir: "target/playwright/test-results",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		[
			"html",
			{
				outputFolder: "target/playwright/playwright-report",
			},
		],
	],
	use: {
		trace: "on",
		video: "on",
	},

	build: {
		external: [],
	},

	projects: [
		{
			name: "m3",
			use: {
				...devices["Desktop Chrome"],
				channel: "chromium",
				extTarget: "m3",
			},
		},
		{
			name: "m2",
			use: {
				...devices["Desktop Chrome"],
				channel: "chromium",
				extTarget: "m2",
			},
		},
	],
});
