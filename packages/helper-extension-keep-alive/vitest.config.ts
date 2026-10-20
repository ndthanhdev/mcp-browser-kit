import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * `@mcp-browser-kit/*` packages carry no `main`/`exports` field — the monorepo
 * resolves them through TS path mapping, which Vite doesn't read.
 */
const aliasToSource = (name: string) => {
	const src = path.resolve(import.meta.dirname, `../${name}/src`);
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
				find: /^webextension-polyfill$/,
				replacement: path.resolve(
					import.meta.dirname,
					"src/testing/webextension-polyfill-stub.ts",
				),
			},
		],
	},
	test: {
		environment: "node",
		include: [
			"src/**/*.test.ts",
		],
	},
});
