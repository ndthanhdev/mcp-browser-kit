import type { Preview } from "@storybook/react-vite";
import { MbkThemeProvider } from "@/theme/mbk-theme-provider";

// Note for future Tailwind-based story roots (e.g. apps/ext-e2e-test-app):
// import that project's CSS entry here so its utility classes are available.
// Nothing imports it today, so it is deliberately left out.

export default {
	parameters: {
		layout: "centered",
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		// Every MUI component in this workspace renders under MbkThemeProvider in
		// production, and several read custom tokens (e.g. `brand.surfaceElevated`)
		// that only exist on that theme. Applying it globally keeps stories honest.
		(Story) => (
			<MbkThemeProvider>
				<Story />
			</MbkThemeProvider>
		),
	],
} satisfies Preview;
