import type { StorybookConfig } from "@storybook/react-vite";
import { storybookAliases, workspaceRoot } from "../vite-aliases.js";

/**
 * One Storybook for the whole workspace.
 *
 * Stories are colocated with their components across `apps/*` and `packages/*`
 * rather than living here, so a new UI project joins simply by adding a
 * `*.stories.tsx` file — no config change required.
 */
export default {
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	addons: [
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
	],
	stories: [
		"../../../apps/*/**/*.mdx",
		"../../../apps/*/**/*.stories.@(ts|tsx)",
		"../../../packages/*/**/*.mdx",
		"../../../packages/*/**/*.stories.@(ts|tsx)",
	],
	viteFinal: (config) => ({
		...config,
		resolve: {
			...config.resolve,
			alias: {
				...(config.resolve?.alias as Record<string, string> | undefined),
				...storybookAliases,
			},
		},
		server: {
			...config.server,
			fs: {
				...config.server?.fs,
				// Stories live outside this project dir; Vite would otherwise refuse
				// to serve them.
				allow: [
					workspaceRoot,
				],
			},
		},
	}),
} satisfies StorybookConfig;
