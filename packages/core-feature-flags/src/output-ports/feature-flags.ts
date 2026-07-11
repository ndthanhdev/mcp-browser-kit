import type { BooleanFlagKey, NumberFlagKey, StringFlagKey } from "../manifest";

export interface FeatureFlagsOutputPort {
	/** Readies the underlying flag provider. Must resolve before any get*Value call below. */
	start(): Promise<void>;
	/** Resolves a boolean flag; falls back to `defaultValue` if the flag is disabled or unknown. */
	getBooleanValue(
		flagKey: BooleanFlagKey,
		defaultValue: boolean,
	): Promise<boolean>;
	/** Resolves a string flag; falls back to `defaultValue` if the flag is disabled or unknown. */
	getStringValue(flagKey: StringFlagKey, defaultValue: string): Promise<string>;
	/** Resolves a number flag; falls back to `defaultValue` if the flag is disabled or unknown. */
	getNumberValue(flagKey: NumberFlagKey, defaultValue: number): Promise<number>;
}

export const FeatureFlagsOutputPort = Symbol("FeatureFlagsOutputPort");
