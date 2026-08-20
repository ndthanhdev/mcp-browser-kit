import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * `@mcp-browser-kit/*` packages carry no `main`/`exports` field — the monorepo
 * resolves them through TS path mapping, which Vite doesn't read. Alias to
 * source, mirroring `tsconfig.json`'s `paths`.
 */
export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^@mcp-browser-kit\/types\/(.*)$/,
				replacement: `${path.resolve(import.meta.dirname, "../types/src")}/$1`,
			},
			{
				find: /^@mcp-browser-kit\/types$/,
				replacement: path.resolve(import.meta.dirname, "../types/src/index.ts"),
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
