import { z } from "zod";

const booleanFlagSchema = z.object({
	flagType: z.literal("boolean"),
	defaultValue: z.boolean(),
	description: z.string(),
});

const stringFlagSchema = z.object({
	flagType: z.literal("string"),
	defaultValue: z.string(),
	description: z.string(),
});

const integerFlagSchema = z.object({
	flagType: z.literal("integer"),
	defaultValue: z.number().int(),
	description: z.string(),
});

const floatFlagSchema = z.object({
	flagType: z.literal("float"),
	defaultValue: z.number(),
	description: z.string(),
});

const flagEntrySchema = z.discriminatedUnion("flagType", [
	booleanFlagSchema,
	stringFlagSchema,
	integerFlagSchema,
	floatFlagSchema,
]);

export type FlagEntry = z.infer<typeof flagEntrySchema>;

/**
 * `satisfies` (not `:`) checks each entry against the zod-derived `FlagEntry`
 * shape without widening the object away from its `as const` literal types —
 * the per-key discrimination below still sees literal `flagType`/`defaultValue`.
 */
export const featureFlagsManifest = {
	"example-flag": {
		flagType: "boolean",
		defaultValue: false,
		description: "Placeholder flag proving the OpenFeature wiring end-to-end.",
	},
} as const satisfies Record<string, FlagEntry>;

/**
 * Re-validated at runtime, immediately, as part of defining the manifest —
 * `satisfies` above only checks the literal typed in this file; this catches
 * anything that type check can't (e.g. `integer` values that aren't whole
 * numbers) and fails at import time for every consumer, not just ones that
 * remember to call a separate validation step.
 */
z.record(z.string(), flagEntrySchema).parse(featureFlagsManifest);

type Flags = typeof featureFlagsManifest;

export type FeatureFlagKey = keyof Flags;

export type BooleanFlagKey = {
	[K in FeatureFlagKey]: Flags[K]["flagType"] extends "boolean" ? K : never;
}[FeatureFlagKey];

export type StringFlagKey = {
	[K in FeatureFlagKey]: Flags[K]["flagType"] extends "string" ? K : never;
}[FeatureFlagKey];

export type NumberFlagKey = {
	[K in FeatureFlagKey]: Flags[K]["flagType"] extends "integer" | "float"
		? K
		: never;
}[FeatureFlagKey];

/** The JS value type a given flag key evaluates to, derived from its `flagType`. */
export type FlagValueType<K extends FeatureFlagKey> =
	Flags[K]["flagType"] extends "boolean"
		? boolean
		: Flags[K]["flagType"] extends "string"
			? string
			: Flags[K]["flagType"] extends "integer" | "float"
				? number
				: unknown;

/** The exact literal default value declared in the manifest for a given flag key. */
export type DefaultValueOf<K extends FeatureFlagKey> = Flags[K]["defaultValue"];

/** Reads a flag's manifest-declared default with its exact literal type preserved. */
export const getDefaultValue = <K extends FeatureFlagKey>(
	flagKey: K,
): DefaultValueOf<K> => featureFlagsManifest[flagKey].defaultValue;
