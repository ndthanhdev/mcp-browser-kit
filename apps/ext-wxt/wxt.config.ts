import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "@playwright/test";
import { defineConfig } from "wxt";

// Patched by scripts:versions-patch at release time. Kept out of package.json
// because the 4-part extension version is not valid semver.
const { version } = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "version.json"), "utf8"),
) as {
	version: string;
};

// Browser binaries for `wxt dev`, resolved from the Playwright-pinned builds
// that scripts:browser-install places in PLAYWRIGHT_BROWSERS_PATH
// (.tmp/browsers). executablePath() only computes a path — it doesn't check the
// file exists — and WXT loads this config for `build`/`zip` too, which never
// launch a browser. Omit anything absent so web-ext falls back to its own
// browser discovery.
const resolveBinaries = (): Record<string, string> => {
	const candidates: Record<string, string> = {
		chrome: chromium.executablePath(),
		firefox: firefox.executablePath(),
	};
	return Object.fromEntries(
		Object.entries(candidates).filter(([, binary]) => fs.existsSync(binary)),
	);
};

// See https://wxt.dev/api/config.html
export default defineConfig({
	webExt: {
		binaries: resolveBinaries(),
	},
	modules: [
		"@wxt-dev/module-react",
		"@wxt-dev/auto-icons",
	],
	autoIcons: {
		baseIconPath: "assets/icon.svg",
		sizes: [
			16,
			32,
			48,
			96,
			128,
		],
	},
	manifest: {
		version,
		// The action has no popup: clicking it opens the sidepanel instead (see
		// entrypoints/background.ts). WXT only emits this key alongside a popup
		// entrypoint, so declare it explicitly or `action.onClicked` never fires.
		action: {},
		// Firefox requires an explicit extension ID to sign the add-on.
		// biome-ignore lint/style/useNamingConvention: required WebExtension manifest key
		browser_specific_settings: {
			gecko: {
				id: "ext-wxt@mcp-browser-kit",
			},
		},
	},
	vite: () => ({
		server: {
			fs: {
				// `wxt dev` serves from this app dir; the branding tokens live at the
				// workspace root, which Vite would otherwise refuse to read.
				allow: [
					path.resolve(__dirname, "../.."),
				],
			},
		},
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
				// Brand design tokens and logos. Lives outside this app, so it needs
				// an alias for both Vite and tsconfig `paths` to resolve it.
				"@mcp-browser-kit/branding": path.resolve(
					__dirname,
					"../../etc/branding",
				),
			},
		},
	}),
});
