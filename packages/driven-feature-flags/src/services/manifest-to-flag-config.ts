import type { BooleanFlagKey } from "@mcp-browser-kit/core-feature-flags";
import { featureFlagsManifest } from "@mcp-browser-kit/core-feature-flags";

type FlagConfig = {
	variants: Record<string, boolean | string | number>;
	defaultVariant: string;
	disabled: boolean;
};

/**
 * Per-app deviations from the manifest's global default, e.g. a boolean flag
 * that a given app's composition root wants resolved differently than the
 * shared manifest default (the manifest itself has no per-app targeting).
 */
export type FeatureFlagOverrides = Partial<Record<BooleanFlagKey, boolean>>;
export const FeatureFlagOverrides = Symbol("FeatureFlagOverrides");

/**
 * Translates the shared flag manifest (flagType + defaultValue) into the
 * `variants`/`defaultVariant`/`disabled` shape OpenFeature's `TypedInMemoryProvider`
 * expects. No official bridge exists between the two shapes (verified against
 * the OpenFeature CLI's manifest schema), so this is the one place that owns
 * the mapping. `featureFlagsManifest` is already validated at import time (see
 * `packages/core-feature-flags/src/manifest.ts`), so no separate validation call
 * is needed here.
 */
export function manifestToFlagConfig(
	overrides: FeatureFlagOverrides = {},
): Record<string, FlagConfig> {
	const config: Record<string, FlagConfig> = {};

	for (const [key, entry] of Object.entries(featureFlagsManifest)) {
		switch (entry.flagType) {
			case "boolean": {
				const value =
					(overrides as Record<string, boolean | undefined>)[key] ??
					entry.defaultValue;
				config[key] = {
					variants: {
						on: true,
						off: false,
					},
					defaultVariant: value ? "on" : "off",
					disabled: false,
				};
				break;
			}
			default: {
				const exhaustiveCheck: never = entry.flagType;
				throw new Error(`Unsupported feature flag type: ${exhaustiveCheck}`);
			}
		}
	}

	return config;
}
