import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * `@mcp-browser-kit/*` packages carry no `main`/`exports` field — the monorepo
 * resolves them through TS path mapping, which Vite doesn't read. Alias to
 * source, mirroring `tsconfig.json`'s `paths` (and `apps/ext-wxt/wxt.config.ts`).
 *
 * Regex `find`s, not strings: Vite's string aliases only match the id exactly or
 * `<find>/…`, so a trailing-slash subpath alias would need a doubled slash to
 * fire and `…/output-ports` would fall through to the bare alias, resolving to
 * `src/index.ts/output-ports`.
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
			// The real polyfill throws on import outside an extension, which would
			// fail every test file that transitively touches `browser.storage`.
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
