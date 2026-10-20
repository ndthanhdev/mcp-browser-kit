import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "@playwright/test";
import { defineConfig } from "wxt";
import { HOST_PERMISSIONS, PERMISSIONS } from "./manifest-permissions";

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

// Persistent `wxt dev` browser profiles, one directory per browser, so logins
// and settings survive restarts. The moon wxt-dev tasks set
// BROWSER_PROFILES_PATH and wxt-profile-clean deletes it; without it web-ext
// falls back to a throwaway profile per run.
const browserProfilesPath = process.env.BROWSER_PROFILES_PATH;

const browserProfiles = browserProfilesPath
	? {
			chromiumProfile: path.join(browserProfilesPath, "chrome"),
			firefoxProfile: path.join(browserProfilesPath, "firefox"),
		}
	: undefined;

/**
 * chrome-launcher merges launch prefs into `Default/Preferences` only one level
 * deep, so the `extensions` and `devtools` objects web-ext and WXT inject would
 * replace the saved ones (pinned toolbar icons, DevTools settings). Passing the
 * saved objects back in makes them survive the merge.
 */
const readSavedChromiumPrefs = (profile: string) => {
	const preferencesFile = path.join(profile, "Default", "Preferences");
	if (!fs.existsSync(preferencesFile)) {
		return {};
	}
	const saved = JSON.parse(fs.readFileSync(preferencesFile, "utf8")) as {
		extensions?: {
			ui?: Record<string, unknown>;
		};
		devtools?: Record<string, unknown>;
	};
	return {
		extensions: {
			...saved.extensions,
			ui: {
				...saved.extensions?.ui,
				// biome-ignore lint/style/useNamingConvention: Chromium pref key
				developer_mode: true,
			},
		},
		devtools: saved.devtools ?? {},
	};
};

/**
 * Workspace packages the extension imports, directly or transitively. Each is
 * aliased to its TypeScript source (see the `resolve.alias` note below).
 */
const workspacePackages = [
	"core-extension",
	"core-feature-flags",
	"core-utils",
	"driven-feature-flags",
	"driven-logger-factory",
	"extension-driven-browser-driver",
	"extension-driven-llm-provider",
	"extension-driving-agent-rpc",
	"helper-extension-keep-alive",
	"helper-extension-tab-lifecycle",
	"types",
];

/**
 * Two aliases per package: the bare specifier resolves to `src/index.ts`, and
 * any subpath resolves under `src/`. Mirrors the `paths` pairs in
 * `tsconfig.json`.
 */
const aliasToSource = (name: string) => {
	const src = path.resolve(__dirname, `../../packages/${name}/src`);
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

// See https://wxt.dev/api/config.html
export default defineConfig({
	webExt: {
		binaries: resolveBinaries(),
		...(browserProfiles && {
			...browserProfiles,
			chromiumPref: readSavedChromiumPrefs(browserProfiles.chromiumProfile),
			keepProfileChanges: true,
		}),
	},
	hooks: {
		// web-ext requires both profile directories to exist before launch.
		"server:started": () => {
			for (const dir of Object.values(browserProfiles ?? {})) {
				fs.mkdirSync(dir, {
					recursive: true,
				});
			}
		},
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
		// See `manifest-permissions.ts` for what needs each one.
		permissions: [
			...PERMISSIONS,
		],
		// biome-ignore lint/style/useNamingConvention: required WebExtension manifest key
		host_permissions: [
			...HOST_PERMISSIONS,
		],
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
			// Array form with regex `find`s, not the object form. `@mcp-browser-kit/*`
			// packages have no `main`/`exports` field — the monorepo otherwise relies
			// on TS path-mapping + esbuild's native tsconfig-paths support (used by
			// tsup), which Vite/Rollup doesn't have.
			//
			// Vite's *string* aliases match the id exactly, so every subpath import
			// (`…/output-ports`, `…/m3`, `…/web`) needed its own entry and a missing
			// one failed at build time. One regex per package covers the bare import
			// and every subpath, so adding a package here is a single line.
			alias: [
				...workspacePackages.flatMap(aliasToSource),
				// Brand design tokens and logos. Lives outside `packages/`, so it
				// needs an alias for both Vite and tsconfig `paths` to resolve it.
				{
					find: /^@mcp-browser-kit\/branding$/,
					replacement: path.resolve(__dirname, "../../etc/branding"),
				},
				{
					find: /^@mcp-browser-kit\/branding\/(.*)$/,
					replacement: `${path.resolve(__dirname, "../../etc/branding")}/$1`,
				},
			],
		},
	}),
});
