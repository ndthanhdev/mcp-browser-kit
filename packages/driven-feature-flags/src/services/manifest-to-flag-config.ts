import { featureFlagsManifest } from "@mcp-browser-kit/core-feature-flags";

type FlagConfig = {
	variants: Record<string, boolean | string | number>;
	defaultVariant: string;
	disabled: boolean;
};

/**
 * Translates the shared flag manifest (flagType + defaultValue) into the
 * `variants`/`defaultVariant`/`disabled` shape OpenFeature's `TypedInMemoryProvider`
 * expects. No official bridge exists between the two shapes (verified against
 * the OpenFeature CLI's manifest schema), so this is the one place that owns
 * the mapping. `featureFlagsManifest` is already validated at import time (see
 * `packages/core-feature-flags/src/manifest.ts`), so no separate validation call
 * is needed here.
 */
export function manifestToFlagConfig(): Record<string, FlagConfig> {
	const config: Record<string, FlagConfig> = {};

	for (const [key, entry] of Object.entries(featureFlagsManifest)) {
		switch (entry.flagType) {
			case "boolean": {
				config[key] = {
					variants: {
						on: true,
						off: false,
					},
					defaultVariant: entry.defaultValue ? "on" : "off",
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
