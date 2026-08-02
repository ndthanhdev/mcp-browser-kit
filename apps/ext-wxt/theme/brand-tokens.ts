import colors from "@mcp-browser-kit/branding/colors.json";

/**
 * Brand design tokens, read straight from `etc/branding/colors.json` — the
 * declared source of truth. Nothing here restates a hex value, so the palette
 * cannot drift from the brand definition.
 *
 * Semantic values in that file may reference a primitive by path, written as
 * `{primitive.emerald.600}`. Those references are resolved below.
 */

/** The set of state slots each semantic token carries. */
export interface BrandTokenStates {
	main: string;
	hover: string;
	selected: string;
	focusVisible: string;
	outlinedBorder: string;
}

/** Semantic token names defined by the brand. */
export type BrandTokenName =
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "danger"
	| "background"
	| "surface"
	| "surfaceElevated"
	| "border"
	| "textPrimary"
	| "textSecondary"
	| "textInverse"
	| "link"
	| "focusRing";

export type BrandTokens = Record<BrandTokenName, BrandTokenStates>;

const referencePattern = /^\{([^}]+)\}$/;

/**
 * Resolve a `{primitive.hue.shade}` reference against the primitive palette.
 * Literal values (already `#rrggbb` or `rgba(...)`) pass through untouched.
 */
const resolveReference = (value: string): string => {
	const reference = referencePattern.exec(value);
	if (!reference?.[1]) {
		return value;
	}

	const resolved = reference[1]
		.split(".")
		.reduce<unknown>(
			(node, segment) =>
				typeof node === "object" && node !== null
					? (node as Record<string, unknown>)[segment]
					: undefined,
			colors,
		);

	if (typeof resolved !== "string") {
		throw new Error(`Unresolvable brand token reference: ${value}`);
	}

	return resolved;
};

const resolveScheme = (scheme: Record<string, BrandTokenStates>): BrandTokens =>
	Object.fromEntries(
		Object.entries(scheme).map(([name, states]) => [
			name,
			{
				main: resolveReference(states.main),
				hover: resolveReference(states.hover),
				selected: resolveReference(states.selected),
				focusVisible: resolveReference(states.focusVisible),
				outlinedBorder: resolveReference(states.outlinedBorder),
			},
		]),
	) as BrandTokens;

export const lightTokens = resolveScheme(colors.semantic.light);
export const darkTokens = resolveScheme(colors.semantic.dark);
