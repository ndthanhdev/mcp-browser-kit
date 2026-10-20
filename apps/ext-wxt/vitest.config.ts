import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the app's pure logic (currently the agent-event → view-model
 * fold). Deliberately does NOT load `wxt.config.ts`: WXT's config pulls in
 * Playwright browser resolution and the extension build pipeline, none of which
 * a pure reducer test needs.
 */
const aliasToSource = (name: string) => {
	const src = path.resolve(import.meta.dirname, `../../packages/${name}/src`);
	return [
		{
			find: new RegExp(`^@mcp-browser-kit/${name}/(.*)$`),
			replacement: `${src}/$1`,
		},
		{
			find: new RegExp(`^@mcp-browser-kit/${name}$`),
			replacement: `${src}/index.ts`,
		},
	];
};

export default defineConfig({
	resolve: {
		alias: [
			...aliasToSource("core-extension"),
			...aliasToSource("core-feature-flags"),
			...aliasToSource("core-utils"),
			...aliasToSource("types"),
			{
				find: /^@\/(.*)$/,
				replacement: `${path.resolve(import.meta.dirname, ".")}/$1`,
			},
		],
	},
	test: {
		environment: "node",
		include: [
			"utils/**/*.test.ts",
			"types/**/*.test.ts",
		],
	},
});
