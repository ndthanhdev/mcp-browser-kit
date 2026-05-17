import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import type { ExtContextOptions } from "./src/fixtures/ext-context";

// Append rather than overwrite so the VS Code debugger's --inspect flags are preserved
const swcRequire = "--require @swc-node/register";
if (!process.env.NODE_OPTIONS?.includes(swcRequire)) {
	process.env.NODE_OPTIONS = [
		process.env.NODE_OPTIONS,
		swcRequire,
	]
		.filter(Boolean)
		.join(" ");
}

// Set browser path for Playwright extension debugging
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(
	__dirname,
	"../../.tmp/playwright/browsers",
);

export default defineConfig<ExtContextOptions>({
	testDir: "./src/tests",
	outputDir: "target/playwright/test-results",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
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

	webServer: [
		{
			command: "moon run ext-e2e-test-app:react-router-start-csr",
			cwd: path.resolve(__dirname, "../.."),
			url: "http://localhost:3000",
			timeout: 30000,
			reuseExistingServer: !process.env.CI,
			env: {
				// biome-ignore lint/style/useNamingConvention: prevent @swc-node/register from leaking into the webServer child process
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
