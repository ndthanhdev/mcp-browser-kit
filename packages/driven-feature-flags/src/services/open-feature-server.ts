import {
	type BooleanFlagKey,
	getDefaultValue,
	type NumberFlagKey,
	type StringFlagKey,
} from "@mcp-browser-kit/core-feature-flags";
import { OpenFeature, TypedInMemoryProvider } from "@openfeature/web-sdk";
import type { Container } from "inversify";
import { injectable } from "inversify";
import { manifestToFlagConfig } from "./manifest-to-flag-config";

/**
 * `TypedInMemoryProvider`'s exported type is generic and expects `as const` literals for full
 * narrowing; we borrow its actual (unexported) constructor-parameter type instead of
 * re-declaring the flag shape by hand.
 */
type FlagConfiguration = ConstructorParameters<typeof TypedInMemoryProvider>[0];

@injectable()
export class DrivenFeatureFlagsOpenFeatureServer {
	readonly name = "DrivenFeatureFlagsOpenFeatureServer";

	async start(): Promise<void> {
		await OpenFeature.setProviderAndWait(
			new TypedInMemoryProvider(manifestToFlagConfig() as FlagConfiguration),
		);
	}

	async stop(): Promise<void> {
		await OpenFeature.clearProviders();
	}

	async getBooleanValue(flagKey: BooleanFlagKey): Promise<boolean> {
		return OpenFeature.getClient().getBooleanValue(
			flagKey,
			getDefaultValue(flagKey),
		);
	}

	async getStringValue(flagKey: StringFlagKey): Promise<string> {
		return OpenFeature.getClient().getStringValue(
			flagKey,
			getDefaultValue(flagKey),
		);
	}

	async getNumberValue(flagKey: NumberFlagKey): Promise<number> {
		return OpenFeature.getClient().getNumberValue(
			flagKey,
			getDefaultValue(flagKey),
		);
	}

	static setupContainer(
		container: Container,
		serviceIdentifier: symbol,
		lifecycleParticipantServiceIdentifier: symbol,
	): void {
		container.bind(serviceIdentifier).to(DrivenFeatureFlagsOpenFeatureServer);
		container
			.bind(lifecycleParticipantServiceIdentifier)
			.toService(serviceIdentifier);
	}
}
