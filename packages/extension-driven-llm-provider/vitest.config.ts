import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * `@mcp-browser-kit/*` packages have no `main`/`exports`, so alias them to
 * source, mirroring `tsconfig.json`'s `paths`.
 */
const aliasToSource = (name: string, entry: string) => [
	{
		find: new RegExp(`^@mcp-browser-kit/${name}/(.*)$`),
		replacement: `${path.resolve(import.meta.dirname, `../${name}/src`)}/$1`,
	},
	{
		find: new RegExp(`^@mcp-browser-kit/${name}$`),
		replacement: path.resolve(import.meta.dirname, entry),
	},
];

export default defineConfig({
	resolve: {
		alias: [
			...aliasToSource("core-extension", "../core-extension/src/index.ts"),
			...aliasToSource(
				"core-feature-flags",
				"../core-feature-flags/src/index.ts",
			),
			...aliasToSource("core-utils", "../core-utils/src/index.ts"),
			...aliasToSource("types", "../types/src/index.ts"),
			// The real polyfill throws on import outside an extension.
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
