import { createTheme } from "@mui/material/styles";
import {
	type BrandTokens,
	darkTokens,
	lightTokens,
} from "@/theme/brand-tokens";

/**
 * Brand tokens that have no equivalent slot in MUI's palette. Declared here so
 * `theme.palette.brand.*` and `theme.vars.palette.brand.*` are type-safe.
 */
export interface BrandPalette {
	surfaceElevated: string;
	textInverse: string;
	link: string;
	focusRing: string;
}

declare module "@mui/material/styles" {
	interface Palette {
		brand: BrandPalette;
	}
	interface PaletteOptions {
		brand: BrandPalette;
	}
}

/**
 * Map brand tokens onto MUI palette slots.
 *
 * Two names differ between the systems and are bridged here:
 * - brand `danger` becomes MUI `error` (MUI has no `danger` channel)
 * - brand `surface` becomes `background.paper`, `background` becomes
 *   `background.default`
 *
 * The remaining four (`surfaceElevated`, `textInverse`, `link`, `focusRing`)
 * have no MUI slot at all and are exposed under `palette.brand`.
 */
const paletteFromTokens = (tokens: BrandTokens) => ({
	primary: {
		main: tokens.primary.main,
	},
	secondary: {
		main: tokens.secondary.main,
	},
	success: {
		main: tokens.success.main,
	},
	warning: {
		main: tokens.warning.main,
	},
	error: {
		main: tokens.danger.main,
	},
	background: {
		default: tokens.background.main,
		paper: tokens.surface.main,
	},
	text: {
		primary: tokens.textPrimary.main,
		secondary: tokens.textSecondary.main,
	},
	divider: tokens.border.main,
	brand: {
		surfaceElevated: tokens.surfaceElevated.main,
		textInverse: tokens.textInverse.main,
		link: tokens.link.main,
		focusRing: tokens.focusRing.main,
	},
	/*
	 * The brand tokens derive their state colours at 8% / 12% / 30%. MUI's own
	 * defaults are 4% / 8% / 12%, so without these overrides any state colour
	 * MUI computes itself would quietly disagree with the brand definition.
	 */
	action: {
		hoverOpacity: 0.08,
		selectedOpacity: 0.12,
		focusOpacity: 0.3,
	},
});

export const theme = createTheme({
	/*
	 * Emit CSS variables and switch schemes on `[data-theme="dark"]` — the same
	 * selector `etc/branding/colors.css` uses, so the two agree if that
	 * stylesheet is ever loaded alongside this theme.
	 */
	cssVariables: {
		colorSchemeSelector: '[data-theme="%s"]',
	},
	colorSchemes: {
		light: {
			palette: paletteFromTokens(lightTokens),
		},
		dark: {
			palette: paletteFromTokens(darkTokens),
		},
	},
	shape: {
		borderRadius: 8,
	},
	typography: {
		fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
	},
});
