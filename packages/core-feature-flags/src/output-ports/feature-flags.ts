import type { BooleanFlagKey, NumberFlagKey, StringFlagKey } from "../manifest";

export interface FeatureFlagsOutputPort {
	/** Readies the underlying flag provider. Must resolve before any get*Value call below. */
	start(): Promise<void>;
	/** Resolves a boolean flag, falling back to its schema-declared default if disabled or unknown. */
	getBooleanValue(flagKey: BooleanFlagKey): Promise<boolean>;
	/** Resolves a string flag, falling back to its schema-declared default if disabled or unknown. */
	getStringValue(flagKey: StringFlagKey): Promise<string>;
	/** Resolves a number flag, falling back to its schema-declared default if disabled or unknown. */
	getNumberValue(flagKey: NumberFlagKey): Promise<number>;
}

export const FeatureFlagsOutputPort = Symbol("FeatureFlagsOutputPort");
