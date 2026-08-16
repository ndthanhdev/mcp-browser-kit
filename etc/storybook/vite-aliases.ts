import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the monorepo root, from `etc/storybook`. */
export const workspaceRoot = path.resolve(here, "../..");

const fromRoot = (...segments: string[]) =>
	path.resolve(workspaceRoot, ...segments);

/**
 * Vite alias map for the aggregated Storybook.
 *
 * `@mcp-browser-kit/*` packages declare no `main`/`exports` field — the monorepo
 * relies on TS path-mapping plus esbuild's native tsconfig-paths support (used
 * by tsup), which Vite/Rollup does not have. Every cross-project import a story
 * can reach therefore needs an explicit alias here.
 *
 * Keep this in sync with the `resolve.alias` block in
 * `apps/ext-wxt/wxt.config.ts` and the `paths` blocks in the per-project
 * tsconfigs.
 */
export const storybookAliases: Record<string, string> = {
	// Longest-prefix entries must come first: Vite matches these in order.
	"@mcp-browser-kit/driven-feature-flags/web": fromRoot(
		"packages/driven-feature-flags/src/web.ts",
	),
	"@mcp-browser-kit/driven-feature-flags": fromRoot(
		"packages/driven-feature-flags/src/index.ts",
	),
	"@mcp-browser-kit/core-feature-flags": fromRoot(
		"packages/core-feature-flags/src/index.ts",
	),
	"@mcp-browser-kit/core-extension": fromRoot(
		"packages/core-extension/src/index.ts",
	),
	"@mcp-browser-kit/core-utils": fromRoot("packages/core-utils/src/index.ts"),
	"@mcp-browser-kit/types": fromRoot("packages/types/src/index.ts"),
	"@mcp-browser-kit/branding": fromRoot("etc/branding"),

	// `@/*` is ext-wxt's own srcDir alias (see apps/ext-wxt/tsconfig.json). It is
	// global here because ext-wxt is the only project using it. If a second app
	// adopts `@`, this map has to become per-story-root instead.
	"@": fromRoot("apps/ext-wxt"),
};
