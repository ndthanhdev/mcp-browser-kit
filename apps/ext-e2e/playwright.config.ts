import { defineConfig, devices } from "@playwright/test";
import type { ExtContextOptions } from "./src/fixtures/ext-context";

process.env.NODE_OPTIONS = "--require @swc-node/register";

export default defineConfig<ExtContextOptions>({
	testDir: "./src/tests",
	outputDir: "target/playwright/test-results",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [
		[
			"html",
			{
				outputFolder: "target/playwright/playwright-report",
				open: "never",
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

	webServer: [
		{
			command: "moon run ext-e2e-test-app:react-router-start-csr",
			url: "http://localhost:3000",
			timeout: 10000,
			reuseExistingServer: !process.env.CI,
			env: {
				// biome-ignore lint/style/useNamingConvention: The issue is that process.env.NODE_OPTIONS = "--require @swc-node/register" is inherited by the webServer child process, causing Yarn to fail.
				NODE_OPTIONS: "",
			},
		},
	],

	projects: [
		{
			name: "m3",
			use: {
				...devices["Desktop Chrome"],
				channel: "chromium",
				extTarget: "m3",
			},
		},
		// {
		// 	name: "m2",
		// 	use: {
		// 		...devices["Desktop Chrome"],
		// 		channel: "chromium",
		// 		extTarget: "m2",
		// 	},
		// },
	],
});
