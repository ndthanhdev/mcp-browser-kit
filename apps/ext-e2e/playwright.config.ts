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
	"../../.tmp/browsers",
);

const shardIndex = Number(process.env.PW_SHARD_INDEX);
const shardTotal = Number(process.env.PW_SHARD_TOTAL);
const shard =
	Number.isInteger(shardIndex) && Number.isInteger(shardTotal) && shardTotal > 0
		? {
				current: shardIndex,
				total: shardTotal,
			}
		: undefined;

export default defineConfig<ExtContextOptions>({
	testDir: "./src/tests",
	outputDir: "target/playwright/test-results",
	timeout: 45000,
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	shard,
	reporter: shard
		? [
				[
					"blob",
					{
						outputDir: "target/playwright/blob-report",
					},
				],
			]
		: [
				[
					"html",
					{
						outputFolder: "target/playwright/playwright-report",
						open: "never",
					},
				],
			],
	use: {
		trace: "retain-on-failure",
		video: "on",
	},

	webServer: [
		{
			command:
				"moon exec ext-e2e-test-app:react-router-start-csr --ignore-ci-checks",
			cwd: path.resolve(__dirname, "../.."),
			url: "http://localhost:3000",
			timeout: 30000,
			reuseExistingServer: !process.env.CI,
			env: {
				// biome-ignore lint/style/useNamingConvention: prevent @swc-node/register from leaking into the webServer child process
				NODE_OPTIONS: "",
			},
		},
		{
			// Serves the same ext-e2e-test-app build bound to a different
			// host:port than the primary webServer above, giving real
			// cross-origin coverage (127.0.0.1:3001 vs localhost:3000) with no
			// extra infra. `react-router-build` is cached, so this is a no-op
			// once the primary webServer's build has already run.
			command:
				"moon run ext-e2e-test-app:react-router-build && yarn serve -s build/client -l tcp://127.0.0.1:3001",
			cwd: path.resolve(__dirname, "../ext-e2e-test-app"),
			url: "http://127.0.0.1:3001",
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
