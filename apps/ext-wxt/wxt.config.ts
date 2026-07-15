import path from "node:path";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: [
		"@wxt-dev/module-react",
	],
	manifest: {
		// Firefox requires an explicit extension ID for MV3.
		// biome-ignore lint/style/useNamingConvention: required WebExtension manifest key
		browser_specific_settings: {
			gecko: {
				id: "ext-wxt@mcp-browser-kit",
			},
		},
	},
	vite: () => ({
		resolve: {
			alias: {
				// @mcp-browser-kit/* packages have no `main`/`exports` field — the monorepo
				// otherwise relies on TS path-mapping + esbuild's native tsconfig-paths
				// support (used by tsup), which Vite/Rollup doesn't have. Alias straight to
				// source so Vite can resolve these imports.
				"@mcp-browser-kit/driven-feature-flags/web": path.resolve(
					__dirname,
					"../../packages/driven-feature-flags/src/web.ts",
				),
				"@mcp-browser-kit/core-feature-flags": path.resolve(
					__dirname,
					"../../packages/core-feature-flags/src/index.ts",
				),
				"@mcp-browser-kit/core-extension": path.resolve(
					__dirname,
					"../../packages/core-extension/src/index.ts",
				),
			},
		},
	}),
});
